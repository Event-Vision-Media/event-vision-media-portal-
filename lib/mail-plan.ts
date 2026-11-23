import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { handoverFor, type DeviceKey } from "@/lib/catalog";
import { dateFromText } from "@/lib/calendar";
import { contractRequired } from "@/lib/contract";
import { getPaymentSummary } from "@/lib/payments";
import { bookedExtraNamesFor, gameAccess, getGame } from "@/lib/guestbook-game-server";
import { GALLERY_UNLOCK_DAYS, getAudioGreetingDeadline, type Booking } from "@/lib/types";
import {
  CONTRACT_REMINDER_AFTER_DAYS,
  GAME_REMINDER_MAX_DAYS,
  GAME_REMINDER_MIN_DAYS,
  GREETING_REMINDER_MAX_DAYS,
  REMINDER_DAYS_BEFORE,
  REMINDER_MIN_DAYS,
} from "@/lib/journey-mails";

/**
 * Voraussichtlich anstehende automatische Kunden-Mails einer Buchung (für den Admin).
 * Spiegelt die Regeln aus lib/journey-mails.ts – inkl. „höchstens eine Mail pro Tag“:
 * Zeitkritisches (Abholung, Zahlung) behält seinen Tag, alles andere rückt bei Überschneidung einen Tag weiter.
 */
export interface PlannedMail {
  date: string;
  label: string;
  /** Zeitkritisch (wird nie verschoben) */
  fixed: boolean;
  note?: string;
  shifted?: boolean;
}

export interface MailPlan {
  items: PlannedMail[];
  /** Warum (noch) nichts geplant wird */
  paused: string | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
function add(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
const maxDate = (...ds: string[]) => ds.sort().at(-1)!;
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function mailPlanFor(b: Booking): Promise<MailPlan> {
  if (!b.email) return { items: [], paused: "Keine E-Mail-Adresse hinterlegt – es gehen keine automatischen Mails raus." };
  if (b.lifecycle !== "bestaetigt") return { items: [], paused: "Automatische Mails starten, sobald die Buchung bestätigt ist." };
  if (b.portal_invite_pending) return { items: [], paused: "Automatische Mails starten, sobald der Portal-Zugang verschickt ist." };

  const supabase = createAdminClient();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const event = b.event_date;
  const [{ data: logs }, { data: contracts }, { data: greeting }, extraNames, game, p] = await Promise.all([
    supabase.from("activity_log").select("event_type, created_at").eq("booking_id", b.id),
    supabase.from("booking_contracts").select("signed_at, handover_window").eq("booking_id", b.id).order("signed_at", { ascending: true }),
    supabase.from("audio_guestbook_greetings").select("booking_id").eq("booking_id", b.id).maybeSingle(),
    bookedExtraNamesFor(b.id),
    getGame(b.id),
    getPaymentSummary(b),
  ]);
  const logged = new Set((logs ?? []).map((l) => l.event_type));
  const firstLog = (types: string[]) => (logs ?? []).filter((l) => types.includes(l.event_type)).map((l) => l.created_at).sort()[0] ?? null;
  const signedAt = contracts?.[0]?.signed_at ?? (b.contract_on_file ? firstLog(["portal_zugang_gesendet", "mail_bestaetigung"]) : null);
  const website = b.source === "website";
  const items: PlannedMail[] = [];
  const push = (date: string, label: string, fixed: boolean, note?: string) => {
    if (date >= today) items.push({ date, label, fixed, note });
  };

  // Abholung morgen (Selbstabholung, Übergabetermin bekannt)
  if (website && !logged.has("abhol_erinnerung")) {
    const pk = (b.inquiry_items?.packages ?? []) as { id: string; product: DeviceKey }[];
    const extraIds = new Set((b.inquiry_items?.extras ?? []).map((e) => e.id));
    if (pk.length && pk.every((x) => handoverFor(x.product, x.id, extraIds) === "abholung")) {
      const text = b.delivery_time_window || contracts?.at(-1)?.handover_window || null;
      const day = b.delivery_date ?? dateFromText(text, event);
      if (text && day) push(add(day, -1), "Abholung morgen", true, p.method === "bar" && !p.restPaid && p.rest ? "mit Barbetrag" : undefined);
    }
  }

  // Zahlungen (nur Website-Buchungen mit Portal-Zahlungen)
  if (website && p.deposit != null && p.rest != null) {
    if (p.deposit > 0 && !p.depositPaid && !b.deposit_reminder_sent_at && signedAt) {
      push(maxDate(today, add(iso(new Date(signedAt)), 7)), "Anzahlung-Erinnerung", true, "falls bis dahin nicht abgehakt");
    }
    if (!p.restPaid && !b.rest_reminder_sent_at && p.afterEvent == null) {
      if (p.method === "ueberweisung" && signedAt) {
        const start = maxDate(today, add(p.restDueDate, -3));
        if (start <= p.restDueDate) push(start, "Restzahlung (Überweisung)", true, "falls bis dahin nicht abgehakt");
      } else if (p.method === "bar" && !items.some((i) => i.label === "Abholung morgen" && i.note)) {
        const start = maxDate(today, add(event, -2));
        if (start <= add(event, -1)) push(start, "Barzahlung bereithalten", true);
      }
    }
  }

  // Vertrag noch nicht unterschrieben
  if (website && contractRequired(b) && !(contracts ?? []).length && !logged.has("vertrag_erinnerung") && b.confirmed_at) {
    const date = maxDate(today, add(iso(new Date(b.confirmed_at)), CONTRACT_REMINDER_AFTER_DAYS));
    const inReminderWindow = !b.reminder_sent_at && date >= add(event, -REMINDER_DAYS_BEFORE) && date <= add(event, -REMINDER_MIN_DAYS);
    if (!inReminderWindow && date <= add(event, -2)) push(date, "Vertrag unterschreiben", false);
  }

  // Allgemeine Erinnerung vor dem Event
  if (!b.reminder_sent_at) {
    const date = maxDate(today, add(event, -REMINDER_DAYS_BEFORE));
    if (date <= add(event, -REMINDER_MIN_DAYS)) push(date, "Erinnerung: offene Schritte & Empfehlungen", false);
  }

  // Begrüßungsansage fürs Audiogästebuch
  if (!greeting && bookingHasAudioGuestbook(b.product_type, extraNames, b.inquiry_items)) {
    const deadline = localISO(getAudioGreetingDeadline(event, b.confirmed_at ?? b.created_at));
    if (!logged.has("ansage_erinnerung")) {
      const date = maxDate(today, add(deadline, -3), add(event, -GREETING_REMINDER_MAX_DAYS));
      if (date <= deadline) push(date, "Begrüßungsansage hochladen", false, `Frist ${deadline.split("-").reverse().join(".")}`);
    }
    if (!logged.has("ansage_erinnerung_frist")) {
      const date = maxDate(today, add(deadline, 2));
      if (date < event) push(date, "Begrüßungsansage fehlt (Frist vorbei)", false, "nur falls dann noch nicht hochgeladen");
    }
  }

  // Gästebuch-Spiel: QR-Aufsteller
  if (gameAccess(b, extraNames, game).active && !logged.has("spiel_erinnerung") && !logged.has("spielkarte_geoeffnet")) {
    const date = maxDate(today, add(event, -GAME_REMINDER_MAX_DAYS));
    if (date <= add(event, -GAME_REMINDER_MIN_DAYS)) push(date, "Gästebuch-Spiel: QR-Aufsteller drucken", false);
  }

  // Nach dem Event: Galerie/Audios + Bewertung
  if (!b.followup_sent_at) push(maxDate(today, add(event, GALLERY_UNLOCK_DAYS)), "Danke + Galerie/Audios + Bewertung", false, "wartet bis zu 14 Tage, falls Fotos/Audios noch fehlen");

  // Online-Galerie: Erinnerung vor dem Ablauf (mit Verlängerungs-Angebot)
  const { data: gal } = await supabase.from("event_galleries").select("expires_at, published_at, deleted_at").eq("booking_id", b.id).maybeSingle();
  if (gal?.published_at && gal.expires_at && !gal.deleted_at && gal.expires_at.slice(0, 10) > today) {
    push(maxDate(today, add(gal.expires_at.slice(0, 10), -5)), "Online-Galerie läuft bald ab (Verlängerung)", false);
  }

  // Firmenkunden: Wiederbuchung ~3 Monate vor dem Jahrestag
  if (b.customer_type === "business" && !logged.has("wiederbuchung_angebot")) push(add(event, 264), "Firmenkunde: „Nächstes Jahr wieder?“", false);

  // Höchstens eine Mail pro Tag: Zeitkritisches zuerst, der Rest rückt nach
  items.sort((a, c) => a.date.localeCompare(c.date) || Number(c.fixed) - Number(a.fixed));
  const taken = new Set<string>();
  for (const it of items) {
    if (!it.fixed) {
      while (taken.has(it.date)) {
        it.date = add(it.date, 1);
        it.shifted = true;
      }
    }
    taken.add(it.date);
  }
  items.sort((a, c) => a.date.localeCompare(c.date));
  return { items, paused: null };
}

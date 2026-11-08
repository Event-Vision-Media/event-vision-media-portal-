import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailDeliveryStatus } from "@/lib/email";
import { openStepsFor } from "@/lib/journey-mails";
import { daysUntil, hasDelivery, type DeviceKey } from "@/lib/catalog";
import type { PersonalMailFacts } from "@/lib/personal-mail";
import type { Booking } from "@/lib/types";

/** Technische Einträge im Aktivitätsprotokoll – nicht im Feed anzeigen. */
export const PERSONAL_MAIL_META = "mail_persoenlich_id";
export const PERSONAL_MAIL_CLICK = "mail_klick";
export const PERSONAL_MAIL = "mail_persoenlich";

export interface PersonalMailHistoryItem {
  id: string;
  subject: string;
  sentAt: string;
  test: boolean;
  delivery: string | null;
  clickedAt: string | null;
}

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "numeric", timeZone: "Europe/Berlin" };

function dateLabel(iso: string): string {
  // „Sonntag, 15.11.“
  return new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", LONG_DATE);
}

/** Frist für eine Rückmeldung: in 3 Tagen, aber spätestens 3 Tage vor dem Event (mindestens morgen). */
function deadlineFor(eventDate: string): string {
  const d = daysUntil(eventDate);
  const inDays = Math.max(1, Math.min(3, d - 3));
  const t = new Date(Date.now() + inDays * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  return dateLabel(t);
}

/** Alles, was die Vorlagen brauchen – inkl. der offenen Punkte dieser Buchung. */
export async function personalMailFacts(b: Booking): Promise<PersonalMailFacts> {
  const sie = b.customer_type === "business";
  const steps = await openStepsFor(b);
  const items = steps.map((s) => (/Mietvertrag/.test(s) ? `${s} (im Kundenportal, dauert keine Minute)` : s));
  const pk = (b.inquiry_items?.packages ?? []) as { id: string; product: DeviceKey }[];
  const delivered = pk.length ? hasDelivery(pk, (b.inquiry_items?.extras ?? []).map((e: any) => e.id)) : true;
  const { count: contracts } = await createAdminClient()
    .from("booking_contracts")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", b.id);
  if (!b.delivery_date && !contracts) {
    items.push(
      delivered
        ? sie
          ? "Mitteilen, wann wir liefern und aufbauen dürfen"
          : "Mitteilen, wann wir liefern dürfen – oder ob du lieber selbst abholst"
        : sie
          ? "Mitteilen, wann Sie abholen möchten"
          : "Mitteilen, wann du abholen möchtest"
    );
  }
  if (!b.phone) items.push(sie ? "Eine Handynummer für kurzfristige Absprachen am Eventtag" : "Deine Handynummer für kurzfristige Absprachen am Eventtag");
  const rawName = (b.customer_name || b.couple_names || "").trim();
  return {
    sie,
    name: sie ? rawName : rawName.split(/\s+/)[0] || rawName,
    bookingCode: b.booking_code,
    eventDateLabel: dateLabel(b.event_date),
    occasion: b.occasion,
    openItems: items,
    deadlineLabel: deadlineFor(b.event_date),
    signer: "Dustin",
  };
}

/** Verschickte persönliche Nachrichten mit Zustellstatus (Resend) und Klick auf den Portal-Link. */
export async function personalMailHistory(bookingId: string): Promise<PersonalMailHistoryItem[]> {
  const { data } = await createAdminClient()
    .from("activity_log")
    .select("id, event_type, message, created_at")
    .eq("booking_id", bookingId)
    .in("event_type", [PERSONAL_MAIL, PERSONAL_MAIL_META, PERSONAL_MAIL_CLICK])
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  const meta = new Map<string, { resend: string | null; subject: string; test: boolean }>();
  for (const r of rows.filter((r) => r.event_type === PERSONAL_MAIL_META)) {
    try {
      const j = JSON.parse(r.message) as { ref: string; resend?: string | null; subject?: string; test?: boolean };
      meta.set(j.ref, { resend: j.resend ?? null, subject: j.subject ?? "", test: Boolean(j.test) });
    } catch {
      // ignorieren
    }
  }
  const clicks = new Map<string, string>();
  for (const r of rows.filter((r) => r.event_type === PERSONAL_MAIL_CLICK)) {
    // älteste = erster Klick (Liste ist absteigend sortiert)
    clicks.set(r.message, r.created_at);
  }
  const mails = rows.filter((r) => r.event_type === PERSONAL_MAIL).slice(0, 8);
  return Promise.all(
    mails.map(async (m) => {
      const info = meta.get(m.id);
      const status = info?.resend ? await mailDeliveryStatus(info.resend) : null;
      return {
        id: m.id,
        subject: info?.subject || m.message,
        sentAt: m.created_at,
        test: info?.test ?? false,
        delivery: status?.status ?? null,
        clickedAt: clicks.get(m.id) ?? null,
      };
    })
  );
}

export interface SilentCustomer {
  bookingId: string;
  bookingCode: string;
  name: string;
  eventDate: string;
  daysLeft: number;
  missing: string[];
  /** Letztes Lebenszeichen: Portal-Anmeldung, sonst Bestätigung. */
  lastSign: string | null;
  lastSignKind: "login" | "bestaetigt" | null;
  lastPersonalMail: string | null;
}

/** Ohne Lebenszeichen seit so vielen Tagen … */
const SILENT_AFTER_DAYS = 4;
/** … bei Events in den nächsten X Tagen. */
const SILENT_WINDOW_DAYS = 14;
/** Nach einer persönlichen Nachricht erst mal so lange Ruhe. */
const SILENT_SNOOZE_DAYS = 3;

/**
 * Bestätigte Buchungen, bei denen das Event näher rückt, noch etwas Wichtiges fehlt
 * (Vertrag oder Übergabe) und der Kunde sich seit Tagen nicht gemeldet hat.
 */
export async function silentCustomers(): Promise<SilentCustomer[]> {
  const { loadBookingInfos } = await import("@/lib/admin-booking-info");
  const supabase = createAdminClient();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const until = new Date(Date.now() + SILENT_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .gte("event_date", today)
    .lte("event_date", until)
    .order("event_date", { ascending: true })
    .limit(60);
  const bookings = (data ?? []) as Booking[];
  if (!bookings.length) return [];
  const infos = await loadBookingInfos(bookings);
  const { data: mails } = await supabase
    .from("activity_log")
    .select("booking_id, created_at")
    .eq("event_type", PERSONAL_MAIL)
    .in("booking_id", bookings.map((b) => b.id))
    .order("created_at", { ascending: false });
  const lastMail = new Map<string, string>();
  for (const m of mails ?? []) if (!lastMail.has(m.booking_id)) lastMail.set(m.booking_id, m.created_at);

  const now = Date.now();
  const ageDays = (iso: string | null) => (iso ? (now - Date.parse(iso)) / 86_400_000 : Infinity);
  const out: SilentCustomer[] = [];
  for (const i of infos) {
    const b = i.booking;
    const missing: string[] = [];
    if (i.contractNeeded && !i.contract) missing.push("Vertrag");
    if (!b.delivery_date && !i.contract?.handover) missing.push("Übergabe");
    if (!b.phone && !i.contract?.onsitePhone) missing.push("Handynummer");
    if (!missing.some((m) => m !== "Handynummer")) continue;
    const lastSign = i.lastLogin ?? b.confirmed_at ?? null;
    if (ageDays(lastSign) < SILENT_AFTER_DAYS) continue;
    const pm = lastMail.get(b.id) ?? null;
    if (ageDays(pm) < SILENT_SNOOZE_DAYS) continue;
    out.push({
      bookingId: b.id,
      bookingCode: b.booking_code,
      name: b.customer_name || b.couple_names,
      eventDate: b.event_date,
      daysLeft: daysUntil(b.event_date),
      missing,
      lastSign,
      lastSignKind: i.lastLogin ? "login" : b.confirmed_at ? "bestaetigt" : null,
      lastPersonalMail: pm,
    });
  }
  return out;
}

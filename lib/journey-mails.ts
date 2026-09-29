import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecommendations } from "@/lib/recommendations";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { daysUntil } from "@/lib/catalog";
import { contractRequired, restDueDaysFor } from "@/lib/contract";
import { logActivity } from "@/lib/activity-log";
import { rebookingMail, waitingInquiriesMail, cashReminderMail, contractReminderMail, depositReminderMail, followupMail, reminderMail, restTransferReminderMail, sendEmail, type MailBooking } from "@/lib/email";
import { getPaymentSummary } from "@/lib/payments";
import { GALLERY_UNLOCK_DAYS, type Booking } from "@/lib/types";

/** Erinnerung geht raus, sobald das Event höchstens so viele Tage entfernt ist … */
const REMINDER_DAYS_BEFORE = 28;
/** … aber nicht mehr, wenn es näher als das ist (dann lohnt es nicht mehr). */
const REMINDER_MIN_DAYS = 3;
/** Nachher-Mail nur für Events der letzten X Tage (verhindert Massenversand beim ersten Start). */
const FOLLOWUP_MAX_AGE_DAYS = 30;
const MAX_PER_RUN = 50;
/** Vertrags-Erinnerung, wenn X Tage nach der Reservierung noch nicht unterschrieben wurde. */
const CONTRACT_REMINDER_AFTER_DAYS = 3;

export interface JourneyRunResult {
  reminders: { booking: string; openSteps: string[]; recommendations: string[]; sent: boolean }[];
  followups: { booking: string; sent: boolean }[];
  contractReminders: { booking: string; sent: boolean }[];
  paymentReminders: { booking: string; kind: "anzahlung" | "rest_ueberweisung" | "rest_bar"; sent: boolean }[];
  /** Anfragen, die seit über 24 Stunden auf deine Bestätigung warten (Sammel-Mail an dich). */
  waitingInquiries: string[];
  adminDigestSent: boolean;
  rebookingOffers: { booking: string; suggestedDate: string; sent: boolean }[];
}

function toMailBooking(b: Booking): MailBooking {
  return {
    booking_code: b.booking_code,
    customer_type: b.customer_type,
    access_code: b.access_code ?? null,
    custom_login_code: b.custom_login_code,
    customer_name: b.customer_name,
    couple_names: b.couple_names,
    event_date: b.event_date,
    event_days: b.event_days ?? 1,
    location: b.location,
    occasion: b.occasion,
    total_price: b.total_price,
    inquiry_items: b.inquiry_items,
  };
}

/** Welche Schritte im Kundenportal sind für diese Buchung noch offen? */
async function openStepsFor(b: Booking): Promise<string[]> {
  const supabase = createAdminClient();
  const sie = b.customer_type === "business";
  const products = new Set([
    ...(b.inquiry_items?.packages ?? []).map((p) => p.product),
    ...(b.product_type === "Fotospiegel" ? ["spiegel"] : b.product_type === "Fotobox" ? ["fotobox"] : []),
  ]);
  const hasPhotoDevice = products.has("spiegel") || products.has("fotobox");
  const steps: string[] = [];

  const { count: contracts } = await supabase
    .from("booking_contracts")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", b.id);
  if (contractRequired(b) && !contracts) steps.push(sie ? "Mietvertrag digital unterschreiben" : "Deinen Mietvertrag digital unterschreiben");

  if (hasPhotoDevice && !b.selected_home_screen_id) steps.push(sie ? "Startbildschirm auswählen" : "Deinen Startbildschirm auswählen");
  if (hasPhotoDevice && !b.selected_layout_id) steps.push(sie ? "Foto-Layout auswählen" : "Dein Foto-Layout auswählen");

  const { data: extras } = await supabase.from("booking_extras").select("extras(name)").eq("booking_id", b.id);
  const names = (extras ?? []).map((e: any) => e.extras?.name).filter(Boolean);
  if (bookingHasAudioGuestbook(b.product_type, names, b.inquiry_items)) {
    const { count } = await supabase
      .from("audio_guestbook_greetings")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", b.id);
    if (!count) steps.push(sie ? "Begrüßungsansage für das Audiogästebuch hochladen" : "Deine Begrüßungsansage fürs Audiogästebuch aufnehmen");
  }
  if (!b.access_notes) steps.push(sie ? "Hinweise zu Anfahrt & Zugang der Location hinterlegen" : "Hinweise zu Anfahrt & Zugang deiner Location hinterlegen");
  return steps;
}

/**
 * Täglicher Lauf: Erinnerungen vor dem Event und Nachher-Mails.
 * dryRun = nichts verschicken und nichts speichern, nur auflisten.
 */
export async function runJourneyMails(dryRun = false): Promise<JourneyRunResult> {
  const supabase = createAdminClient();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const addDays = (n: number) => {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const result: JourneyRunResult = { reminders: [], followups: [], contractReminders: [], paymentReminders: [], waitingInquiries: [], adminDigestSent: false, rebookingOffers: [] };

  // ---- Für dich: Anfragen, die seit über 24 Stunden unbeantwortet sind ----
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { data: waiting } = await supabase
    .from("bookings")
    .select("booking_code, customer_name, couple_names, event_date, lifecycle")
    .eq("source", "website")
    .in("lifecycle", ["anfrage", "reserviert"])
    .lte("created_at", dayAgo)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  result.waitingInquiries = (waiting ?? []).map((w) => w.booking_code);
  if (!dryRun && waiting?.length && process.env.ADMIN_EMAIL) {
    result.adminDigestSent = (await sendEmail({ to: process.env.ADMIN_EMAIL, ...waitingInquiriesMail(waiting) })).sent;
  }

  // ---- Mietvertrag noch nicht unterschrieben (einmalige Erinnerung) ----
  const cutoff = new Date(Date.now() - CONTRACT_REMINDER_AFTER_DAYS * 86_400_000).toISOString();
  const { data: unsignedCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .not("email", "is", null)
    .lte("confirmed_at", cutoff)
    .gte("event_date", addDays(2))
    .limit(MAX_PER_RUN);
  const candidateIds = (unsignedCandidates ?? []).map((b) => b.id);
  if (candidateIds.length) {
    const [{ data: signed }, { data: reminded }] = await Promise.all([
      supabase.from("booking_contracts").select("booking_id").in("booking_id", candidateIds),
      supabase.from("activity_log").select("booking_id").eq("event_type", "vertrag_erinnerung").in("booking_id", candidateIds),
    ]);
    const skip = new Set([...(signed ?? []), ...(reminded ?? [])].map((r) => r.booking_id));
    for (const b of (unsignedCandidates ?? []) as Booking[]) {
      if (skip.has(b.id)) continue;
      // Steht die allgemeine Erinnerung (mit dem Vertrag als erstem offenen Schritt) ohnehin an, keine zweite Mail
      const days = daysUntil(b.event_date);
      if (!b.reminder_sent_at && days >= REMINDER_MIN_DAYS && days <= REMINDER_DAYS_BEFORE) continue;
      let sent = false;
      if (!dryRun) {
        sent = (await sendEmail({ to: b.email!, ...contractReminderMail(toMailBooking(b)) })).sent;
        if (sent) await logActivity(b.id, "vertrag_erinnerung", `Mietvertrag ${CONTRACT_REMINDER_AFTER_DAYS} Tage nach der Bestätigung noch nicht unterschrieben – Erinnerung verschickt`);
      }
      result.contractReminders.push({ booking: b.booking_code, sent });
    }
  }

  // ---- Erinnerungen vor dem Event ----
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .not("email", "is", null)
    .is("reminder_sent_at", null)
    .gte("event_date", addDays(REMINDER_MIN_DAYS))
    .lte("event_date", addDays(REMINDER_DAYS_BEFORE))
    .limit(MAX_PER_RUN);

  for (const b of (upcoming ?? []) as Booking[]) {
    const openSteps = await openStepsFor(b);
    const recs = (await getRecommendations(b, 2)).map((r) => ({ name: r.extra.name, priceLabel: r.priceLabel }));
    let sent = false;
    if (!dryRun) {
      const mail = reminderMail(toMailBooking(b), openSteps, recs);
      sent = (await sendEmail({ to: b.email!, ...mail })).sent;
      if (sent) {
        await supabase.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
        await logActivity(b.id, "erinnerung", `Erinnerungs-E-Mail verschickt (${openSteps.length} offene Schritte)`);
      }
    }
    result.reminders.push({ booking: b.booking_code, openSteps, recommendations: recs.map((r) => r.name), sent });
  }

  // ---- Nachher: Galerie + Bewertung ----
  const { data: reviewSetting } = await supabase.from("app_settings").select("value").eq("key", "google_review_url").maybeSingle();
  const reviewUrl = (reviewSetting?.value as string | undefined) || null;
  const { data: past } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .not("email", "is", null)
    .is("followup_sent_at", null)
    .lte("event_date", addDays(-GALLERY_UNLOCK_DAYS))
    .gte("event_date", addDays(-FOLLOWUP_MAX_AGE_DAYS))
    .limit(MAX_PER_RUN);

  for (const b of (past ?? []) as Booking[]) {
    if (daysUntil(b.event_date) > -GALLERY_UNLOCK_DAYS) continue;
    let sent = false;
    if (!dryRun) {
      sent = (await sendEmail({ to: b.email!, ...followupMail(toMailBooking(b), reviewUrl) })).sent;
      if (sent) {
        await supabase.from("bookings").update({ followup_sent_at: new Date().toISOString() }).eq("id", b.id);
        await logActivity(b.id, "nachher_mail", "Galerie- & Bewertungs-E-Mail verschickt");
      }
    }
    result.followups.push({ booking: b.booking_code, sent });
  }

  // ---- Zahlungen ----
  const confirmedCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: payCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .not("email", "is", null)
    .gte("event_date", addDays(1))
    .lte("event_date", addDays(400))
    .or("deposit_paid_at.is.null,rest_paid_at.is.null")
    .limit(MAX_PER_RUN * 2);

  const payIds = (payCandidates ?? []).map((b) => b.id);
  const signedAtBy = new Map<string, string>();
  const dueDaysBy = new Map<string, number>();
  if (payIds.length) {
    const { data: signedRows } = await supabase.from("booking_contracts").select("booking_id, signed_at, template_version").in("booking_id", payIds).order("signed_at", { ascending: true });
    for (const r of signedRows ?? []) {
      if (!signedAtBy.has(r.booking_id)) signedAtBy.set(r.booking_id, r.signed_at);
      dueDaysBy.set(r.booking_id, restDueDaysFor(r.template_version));
    }
  }
  for (const b of (payCandidates ?? []) as Booking[]) {
    const days = daysUntil(b.event_date);
    const signedAt = signedAtBy.get(b.id);
    // Restbetrag per Überweisung: Erinnerung 3 Tage vor bis zur Fälligkeit (14 bzw. bei alten Verträgen 7 Tage vorher)
    let kind: "anzahlung" | "rest_ueberweisung" | "rest_bar" | null = null;
    // Anzahlungsrechnung geht nach der Vertragsunterschrift raus – Erinnerung 7 Tage danach
    if (!b.deposit_paid_at && !b.deposit_reminder_sent_at && signedAt && signedAt <= confirmedCutoff) kind = "anzahlung";
    else if (!b.rest_paid_at && !b.rest_reminder_sent_at && b.rest_payment_method === "ueberweisung" && signedAt && days >= dueDaysBy.get(b.id)! && days <= dueDaysBy.get(b.id)! + 3) kind = "rest_ueberweisung";
    else if (!b.rest_paid_at && !b.rest_reminder_sent_at && b.rest_payment_method === "bar" && days >= 1 && days <= 2) kind = "rest_bar";
    if (!kind) continue;

    const p = await getPaymentSummary(b);
    if (p.deposit == null || p.rest == null) continue;
    let sent = false;
    if (!dryRun) {
      const mb = toMailBooking(b);
      const mail =
        kind === "anzahlung"
          ? depositReminderMail(mb, p.deposit, p.bank)
          : kind === "rest_ueberweisung"
            ? restTransferReminderMail(mb, p.rest, p.restDueDate, p.bank)
            : cashReminderMail(mb, p.rest);
      sent = (await sendEmail({ to: b.email!, ...mail })).sent;
      if (sent) {
        const column = kind === "anzahlung" ? "deposit_reminder_sent_at" : "rest_reminder_sent_at";
        await supabase.from("bookings").update({ [column]: new Date().toISOString() }).eq("id", b.id);
        await logActivity(
          b.id,
          "zahlung_erinnerung",
          kind === "anzahlung" ? "Erinnerung Anzahlung verschickt" : kind === "rest_bar" ? "Hinweis Barzahlung bei Lieferung verschickt" : "Erinnerung Restzahlung verschickt"
        );
      }
    }
    result.paymentReminders.push({ booking: b.booking_code, kind, sent });
  }

  // ---- Firmenkunden: "Nächstes Jahr wieder?" ca. 3 Monate vor dem Jahrestag ----
  const website = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://fotobox-essen.com").replace(/\/$/, "");
  const { data: lastYear } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_type", "business")
    .eq("lifecycle", "bestaetigt")
    .not("email", "is", null)
    .gte("event_date", addDays(-284))
    .lte("event_date", addDays(-264))
    .limit(MAX_PER_RUN);
  const lastYearIds = (lastYear ?? []).map((b) => b.id);
  if (lastYearIds.length) {
    const { data: offered } = await supabase
      .from("activity_log")
      .select("booking_id")
      .eq("event_type", "wiederbuchung_angebot")
      .in("booking_id", lastYearIds);
    const already = new Set((offered ?? []).map((o) => o.booking_id));
    for (const b of (lastYear ?? []) as Booking[]) {
      if (already.has(b.id)) continue;
      // gleicher Wochentag im Folgejahr
      const d = new Date(b.event_date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 364);
      const suggested = d.toISOString().slice(0, 10);
      const product = b.inquiry_items?.packages?.[0];
      const link = `${website}/anfrage.html?typ=business&datum=${suggested}${product ? `&produkt=${product.product}&paket=${product.id}` : ""}`;
      let sent = false;
      if (!dryRun) {
        sent = (await sendEmail({ to: b.email!, ...rebookingMail(toMailBooking(b), suggested, link) })).sent;
        if (sent) await logActivity(b.id, "wiederbuchung_angebot", `„Nächstes Jahr wieder?“-Mail verschickt (Vorschlag ${suggested})`);
      }
      result.rebookingOffers.push({ booking: b.booking_code, suggestedDate: suggested, sent });
    }
  }

  return result;
}

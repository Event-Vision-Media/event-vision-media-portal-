import "server-only";
import { mediaStatus } from "@/lib/media-ready";
import { staffUpsellFor } from "@/lib/staff-upsell";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecommendations } from "@/lib/recommendations";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { PRODUCT_LABELS, daysUntil, handoverFor, hasDelivery, type DeviceKey } from "@/lib/catalog";
import { dateFromText } from "@/lib/calendar";
import { contractRequired, depositForBooking, fullPaymentTerms, isShortNotice, restDueDaysFor, SHORT_LAST_DAYS } from "@/lib/contract";
import { logActivity } from "@/lib/activity-log";
import { reviewReminderMail, galleryExpiryMail, gameReminderMail, greetingAdminMail, greetingReminderMail, rebookingMail, waitingInquiriesMail, cashReminderMail, pickupReminderMail, contractReminderMail, depositReminderMail, followupMail, reminderMail, restTransferReminderMail, sendEmail, type MailBooking } from "@/lib/email";
import { getPaymentSummary } from "@/lib/payments";
import { GALLERY_UNLOCK_DAYS, getAudioGreetingDeadline, type Booking } from "@/lib/types";
import { deliveryUpsells } from "@/lib/delivery-upsell";
import { vbAddonState } from "@/lib/vb-upsell";
import { reviewLink } from "@/lib/review-link";
import { activeVbPromo, vbPrice } from "@/lib/vb-promo";
import { usesSie } from "@/lib/address";
import { gameTitle, namesFromBooking, occasionFromBooking } from "@/lib/guestbook-game";
import { gameAccess, gameConfig, type GuestbookGameRow } from "@/lib/guestbook-game-server";
import { GALLERY_DAYS, GALLERY_EXTENSIONS, GALLERY_MAX_DAYS, GALLERY_REMIND_DAYS } from "@/lib/event-gallery";
import { galleryPublicUrl } from "@/lib/event-gallery-server";

/** Erinnerung geht raus, sobald das Event höchstens so viele Tage entfernt ist … */
export const REMINDER_DAYS_BEFORE = 28;
/** … aber nicht mehr, wenn es näher als das ist (dann lohnt es nicht mehr). */
export const REMINDER_MIN_DAYS = 3;
/** Nachher-Mail nur für Events der letzten X Tage (verhindert Massenversand beim ersten Start). */
export const FOLLOWUP_MAX_AGE_DAYS = 30;
/** Tage nach der Danke-Mail bis zur (einmaligen) Bewertungs-Erinnerung */
export const REVIEW_REMINDER_DAYS = 7;
/** Erst Danke-Mails ab hier haben den mitzählenden Bewertungs-Link – ältere bekommen keine Erinnerung. */
export const REVIEW_TRACKING_SINCE = "2026-11-26T00:00:00+01:00";
const MAX_PER_RUN = 50;
/** Vertrags-Erinnerung, wenn X Tage nach der Reservierung noch nicht unterschrieben wurde. */
export const CONTRACT_REMINDER_AFTER_DAYS = 3;
/** Begrüßungsansage: nur Events in den nächsten X Tagen prüfen (Frist liegt 7 Tage vorher). */
export const GREETING_REMINDER_MAX_DAYS = 14;
/** Gästebuch-Spiel: Erinnerung an den QR-Aufsteller, wenn das Event 2–7 Tage entfernt ist. */
export const GAME_REMINDER_MAX_DAYS = 7;
export const GAME_REMINDER_MIN_DAYS = 2;

export interface JourneyRunResult {
  reminders: { booking: string; openSteps: string[]; recommendations: string[]; sent: boolean }[];
  followups: { booking: string; sent: boolean }[];
  reviewReminders: { booking: string; sent: boolean }[];
  contractReminders: { booking: string; sent: boolean }[];
  paymentReminders: { booking: string; kind: "anzahlung" | "rest_ueberweisung" | "rest_bar"; sent: boolean }[];
  /** Selbstabholung: Erinnerung am Tag vor der Abholung. */
  pickupReminders: { booking: string; sent: boolean }[];
  /** Anfragen, die seit über 24 Stunden auf deine Bestätigung warten (Sammel-Mail an dich). */
  waitingInquiries: string[];
  adminDigestSent: boolean;
  rebookingOffers: { booking: string; suggestedDate: string; sent: boolean }[];
  /** Audiogästebuch: Begrüßungsansage fehlt (kurz vor bzw. nach der Frist). */
  greetingReminders: { booking: string; kind: "bald" | "ueberfaellig"; sent: boolean }[];
  /** Gästebuch-Spiel: Erinnerung an den QR-Aufsteller. */
  gameReminders: { booking: string; sent: boolean }[];
  /** Online-Galerie läuft in wenigen Tagen ab (mit Verlängerungs-Angebot). */
  galleryExpiry: { booking: string; sent: boolean }[];
}

function toMailBooking(b: Booking): MailBooking {
  return {
    booking_code: b.booking_code,
    // Ansprache aus der Buchung (Du/Sie, Frau/Herr) – sonst greift die Automatik „Firma = Sie“
    address_form: b.address_form ?? null,
    salutation: b.salutation ?? null,
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

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const dateDE = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE");

/** Eintrag fürs Aktivitätsprotokoll: an wen, welche Mail (Betreff), warum. */
function mailLog(b: Booking, subject: string, reason: string): string {
  return `📧 Mail an ${b.customer_name || b.couple_names}${b.email ? ` (${b.email})` : ""}: „${subject}“ – ${reason}`;
}

/** Welche Schritte im Kundenportal sind für diese Buchung noch offen? */
export async function openStepsFor(b: Booking): Promise<string[]> {
  const supabase = createAdminClient();
  const sie = usesSie(b);
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
  // Hinweise zur Location nur, wenn wir liefern (nicht bei Selbstabholung/Versand)
  const pk = (b.inquiry_items?.packages ?? []) as { id: string; product: DeviceKey }[];
  const delivered = pk.length ? hasDelivery(pk, (b.inquiry_items?.extras ?? []).map((e) => e.id)) : true;
  if (delivered && !b.access_notes) steps.push(sie ? "Hinweise zu Anfahrt & Zugang der Location hinterlegen" : "Hinweise zu Anfahrt & Zugang deiner Location hinterlegen");
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
  const result: JourneyRunResult = { reminders: [], followups: [], reviewReminders: [], contractReminders: [], paymentReminders: [], pickupReminders: [], waitingInquiries: [], adminDigestSent: false, rebookingOffers: [], greetingReminders: [], gameReminders: [], galleryExpiry: [] };

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

  // Höchstens eine automatische Mail pro Kunde und Tag. Zeitkritisches (Abholung morgen, Zahlungen)
  // läuft zuerst; alles andere wartet bei einer Überschneidung bis zum nächsten Lauf (Folgetag).
  const mailedToday = new Set<string>();

  // ---- Selbstabholung: Erinnerung am Tag vor der Abholung (inkl. Barbetrag) ----
  const { data: pickupCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .eq("portal_invite_pending", false)
    .not("email", "is", null)
    .gte("event_date", addDays(1))
    .lte("event_date", addDays(4))
    .limit(MAX_PER_RUN);
  const pickupIds = (pickupCandidates ?? []).map((b) => b.id);
  if (pickupIds.length) {
    const [{ data: windows }, { data: done }] = await Promise.all([
      supabase.from("booking_contracts").select("booking_id, handover_window, return_window, signed_at").in("booking_id", pickupIds).order("signed_at", { ascending: false }),
      supabase.from("activity_log").select("booking_id").eq("event_type", "abhol_erinnerung").in("booking_id", pickupIds),
    ]);
    const sentBefore = new Set((done ?? []).map((r) => r.booking_id));
    const contractBy = new Map<string, { handover_window: string | null; return_window: string | null }>();
    for (const w of windows ?? []) if (!contractBy.has(w.booking_id)) contractBy.set(w.booking_id, w);
    for (const b of (pickupCandidates ?? []) as Booking[]) {
      if (sentBefore.has(b.id)) continue;
      const pk = (b.inquiry_items?.packages ?? []) as { id: string; product: DeviceKey }[];
      const extraIds = new Set((b.inquiry_items?.extras ?? []).map((e) => e.id));
      // Nur, wenn alle Geräte bei uns abgeholt werden (kein Lieferservice, kein Versand)
      if (!pk.length || !pk.every((p) => handoverFor(p.product, p.id, extraIds) === "abholung")) continue;
      const c = contractBy.get(b.id);
      const handoverText = b.delivery_time_window || c?.handover_window || null;
      const handoverDate = b.delivery_date ?? dateFromText(handoverText, b.event_date);
      if (!handoverText || handoverDate !== addDays(1)) continue;

      const p = await getPaymentSummary(b);
      const cash = p.method === "bar" && !p.restPaid && p.rest ? p.rest : null;
      let sent = false;
      if (!dryRun) {
        const mail = pickupReminderMail(toMailBooking(b), {
          devices: pk.map((x) => PRODUCT_LABELS[x.product]).join(" und "),
          handover: handoverText,
          ret: b.pickup_time_window || c?.return_window || null,
          cash,
        });
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) {
          await logActivity(b.id, "abhol_erinnerung", mailLog(b, mail.subject, `Abholung morgen bei dir (${handoverText})${cash ? `, bar mitbringen: ${eur(cash)}` : ""}.`));
          // Barbetrag steht schon drin – keine zweite Mail zur Barzahlung
          if (cash) await supabase.from("bookings").update({ rest_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
        }
      }
      if (sent || dryRun) mailedToday.add(b.id);
      result.pickupReminders.push({ booking: b.booking_code, sent });
    }
  }

  // ---- Zahlungen ----
  const confirmedCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: payCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .eq("portal_invite_pending", false)
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
    // Bestandsbuchung (Vertrag liegt auf Papier vor): Start ist der Versand des Portal-Zugangs
    // (bzw. die Bestätigung mit Mail) – nicht direkt nach der Einladung schon erinnern.
    const onFile = ((payCandidates ?? []) as Booking[]).filter((b) => b.contract_on_file && !signedAtBy.has(b.id));
    if (onFile.length) {
      const { data: invites } = await supabase
        .from("activity_log")
        .select("booking_id, created_at")
        .in("event_type", ["portal_zugang_gesendet", "mail_bestaetigung"])
        .in("booking_id", onFile.map((b) => b.id))
        .order("created_at", { ascending: true });
      for (const r of invites ?? []) if (!signedAtBy.has(r.booking_id)) signedAtBy.set(r.booking_id, r.created_at);
      for (const b of onFile) dueDaysBy.set(b.id, restDueDaysFor(null));
    }
  }
  for (const b of (payCandidates ?? []) as Booking[]) {
    const days = daysUntil(b.event_date);
    const signedAt = signedAtBy.get(b.id);
    // Restbetrag per Überweisung: Erinnerung 3 Tage vor bis zur Fälligkeit (14 bzw. bei alten Verträgen 7 Tage vorher)
    let kind: "anzahlung" | "rest_ueberweisung" | "rest_bar" | null = null;
    // Ohne Anzahlung (Gesamtpreis bis NO_DEPOSIT_UP_TO) entfällt die Anzahlungs-Erinnerung
    const noDeposit = b.deposit_amount != null ? Number(b.deposit_amount) === 0 : b.total_price != null && depositForBooking(Number(b.total_price), b) === 0;
    // Kurzfristige Buchung: Gesamtbetrag spätestens 2 Tage vorher – Erinnerung 2–5 Tage vor dem Event
    const dueDays = isShortNotice(b) ? SHORT_LAST_DAYS : fullPaymentTerms(b)?.dueDays ?? dueDaysBy.get(b.id)!;
    // Anzahlungsrechnung geht nach der Vertragsunterschrift raus – Erinnerung 7 Tage danach
    if (!noDeposit && !b.deposit_paid_at && !b.deposit_reminder_sent_at && signedAt && signedAt <= confirmedCutoff) kind = "anzahlung";
    else if (!b.rest_paid_at && !b.rest_reminder_sent_at && b.rest_payment_method === "ueberweisung" && signedAt && days >= dueDays && days <= dueDays + 3) kind = "rest_ueberweisung";
    else if (!b.rest_paid_at && !b.rest_reminder_sent_at && b.rest_payment_method === "bar" && days >= 1 && days <= 2) kind = "rest_bar";
    // Rechnung erst nach der Veranstaltung (so vereinbart): keine Zahlungserinnerungen vor dem Event
    if (kind !== "anzahlung" && fullPaymentTerms(b)?.after) kind = null;
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
            : cashReminderMail(mb, p.rest, { pickup: p.pickupOnly, full: p.deposit === 0 });
      sent = (await sendEmail({ to: b.email!, ...mail })).sent;
      if (sent) {
        const column = kind === "anzahlung" ? "deposit_reminder_sent_at" : "rest_reminder_sent_at";
        await supabase.from("bookings").update({ [column]: new Date().toISOString() }).eq("id", b.id);
        await logActivity(
          b.id,
          "zahlung_erinnerung",
          mailLog(
            b,
            mail.subject,
            kind === "anzahlung"
              ? `Anzahlung ${eur(p.deposit)} 7 Tage nach ${b.contract_on_file ? "dem Versand des Portal-Zugangs" : "der Vertragsunterschrift"} noch nicht als bezahlt abgehakt.`
              : kind === "rest_bar"
                ? `Event in ${days} Tagen: ${eur(p.rest)} bar bei der ${p.pickupOnly ? "Abholung" : "Lieferung"} bereithalten.`
                : `Restbetrag ${eur(p.rest)} per Überweisung fällig bis ${dateDE(p.restDueDate)}.`
          )
        );
      }
    }
    if (sent || dryRun) mailedToday.add(b.id);
    result.paymentReminders.push({ booking: b.booking_code, kind, sent });
  }

  // ---- Mietvertrag noch nicht unterschrieben (einmalige Erinnerung) ----
  const cutoff = new Date(Date.now() - CONTRACT_REMINDER_AFTER_DAYS * 86_400_000).toISOString();
  const { data: unsignedCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .eq("contract_on_file", false)
    .eq("portal_invite_pending", false)
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
      if (skip.has(b.id) || mailedToday.has(b.id)) continue;
      // Steht die allgemeine Erinnerung (mit dem Vertrag als erstem offenen Schritt) ohnehin an, keine zweite Mail
      const days = daysUntil(b.event_date);
      if (!b.reminder_sent_at && days >= REMINDER_MIN_DAYS && days <= REMINDER_DAYS_BEFORE) continue;
      let sent = false;
      if (!dryRun) {
        const mail = contractReminderMail(toMailBooking(b));
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) await logActivity(b.id, "vertrag_erinnerung", mailLog(b, mail.subject, `Grund: Mietvertrag ${CONTRACT_REMINDER_AFTER_DAYS} Tage nach deiner Bestätigung noch nicht unterschrieben.`));
      }
      if (sent || dryRun) mailedToday.add(b.id);
      result.contractReminders.push({ booking: b.booking_code, sent });
    }
  }

  // ---- Erinnerungen vor dem Event ----
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .eq("portal_invite_pending", false)
    .not("email", "is", null)
    .is("reminder_sent_at", null)
    .gte("event_date", addDays(REMINDER_MIN_DAYS))
    .lte("event_date", addDays(REMINDER_DAYS_BEFORE))
    .limit(MAX_PER_RUN);

  for (const b of (upcoming ?? []) as Booking[]) {
    if (mailedToday.has(b.id)) continue;
    const openSteps = await openStepsFor(b);
    // Selbstabholung gebucht? Dann zuerst die bequeme Lieferung empfehlen
    const delivery = deliveryUpsells(b.inquiry_items)[0];
    // 360° ohne Betreuung: Betreuung durch Personal als erste Empfehlung (Anfrage im Portal)
    const staff = staffUpsellFor(b);
    const staffRec = staff && !staff.requested ? [{ name: "Betreuung durch Personal für die 360° Video Booth", priceLabel: `${eur(staff.price)} für ${staff.includedHours} Std.` }] : [];
    const recs = [
      ...staffRec,
      ...(delivery && !staffRec.length ? [{ name: "Lieferung, Aufbau & Abholung durch uns", priceLabel: `+${delivery.price.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}` }] : []),
      ...(await getRecommendations(b, delivery || staffRec.length ? 1 : 2)).map((r) => ({ name: r.extra.name, priceLabel: r.priceLabel })),
    ];
    let sent = false;
    if (!dryRun) {
      // VisionBooth als Zusatz empfehlen (nur wenn eingeschaltet und noch keine angelegt)
      // Während einer Aktion (Black Week): reduzierter Preis, durchgestrichen der normale Zusatz-Preis
      const vbBase = b.customer_type === "business" || b.company ? { price: 149, list: 299 } : { price: 59, list: 129 };
      const vbPromo = activeVbPromo();
      const vbOffer = (await vbAddonState(b)).offer
        ? vbPromo
          ? { price: vbPrice(vbBase.price), list: vbBase.price, promo: `${vbPromo.label} −${vbPromo.percent} % · nur bis ${vbPromo.untilLabel}` }
          : vbBase
        : null;
      const mail = reminderMail(toMailBooking(b), openSteps, recs, vbOffer);
      sent = (await sendEmail({ to: b.email!, ...mail })).sent;
      if (sent) {
        await supabase.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
        await logActivity(
          b.id,
          "erinnerung",
          mailLog(
            b,
            mail.subject,
            `Event in ${daysUntil(b.event_date)} Tagen. ${openSteps.length ? `Noch offen: ${openSteps.join(", ")}.` : "Alles erledigt – Vorfreude-Mail."}${recs.length ? ` Empfohlen: ${recs.map((r) => r.name).join(", ")}.` : ""}`
          )
        );
      }
    }
    if (sent || dryRun) mailedToday.add(b.id);
    result.reminders.push({ booking: b.booking_code, openSteps, recommendations: recs.map((r) => r.name), sent });
  }

  // ---- Audiogästebuch: Begrüßungsansage fehlt noch ----
  // "bald": 0–3 Tage vor der Frist (Frist = 7 Tage vor dem Event, kurzfristig 2 Tage).
  // "ueberfaellig": ab 2 Tage nach der Frist, solange das Event noch bevorsteht – plus Info an dich.
  // Jede Mail pro Buchung nur einmal (activity_log).
  const { data: greetCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .eq("portal_invite_pending", false)
    .not("email", "is", null)
    .gte("event_date", addDays(1))
    .lte("event_date", addDays(GREETING_REMINDER_MAX_DAYS))
    .limit(MAX_PER_RUN);
  const greetIds = (greetCandidates ?? []).map((b) => b.id);
  if (greetIds.length) {
    const [{ data: greetings }, { data: greetLogs }, { data: greetExtras }] = await Promise.all([
      supabase.from("audio_guestbook_greetings").select("booking_id").in("booking_id", greetIds),
      supabase.from("activity_log").select("booking_id, event_type").in("event_type", ["ansage_erinnerung", "ansage_erinnerung_frist"]).in("booking_id", greetIds),
      supabase.from("booking_extras").select("booking_id, extras(name)").in("booking_id", greetIds),
    ]);
    const hasGreeting = new Set((greetings ?? []).map((r) => r.booking_id));
    const logged = new Set((greetLogs ?? []).map((r) => `${r.booking_id}:${r.event_type}`));
    const extraNames = new Map<string, string[]>();
    for (const r of (greetExtras ?? []) as { booking_id: string; extras: { name: string } | { name: string }[] | null }[]) {
      const list = extraNames.get(r.booking_id) ?? [];
      for (const e of Array.isArray(r.extras) ? r.extras : r.extras ? [r.extras] : []) list.push(e.name);
      extraNames.set(r.booking_id, list);
    }
    for (const b of (greetCandidates ?? []) as Booking[]) {
      if (hasGreeting.has(b.id) || mailedToday.has(b.id)) continue;
      if (!bookingHasAudioGuestbook(b.product_type, extraNames.get(b.id) ?? [], b.inquiry_items)) continue;
      const deadline = getAudioGreetingDeadline(b.event_date, b.confirmed_at ?? b.created_at);
      const deadlineISO = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}-${String(deadline.getDate()).padStart(2, "0")}`;
      const toDeadline = daysUntil(deadlineISO);
      let kind: "bald" | "ueberfaellig" | null = null;
      if (toDeadline >= 0 && toDeadline <= 3 && !logged.has(`${b.id}:ansage_erinnerung`)) {
        // Allgemeine Erinnerung (mit der Ansage als offenem Schritt) gerade erst verschickt? Dann nicht doppelt.
        const recent = b.reminder_sent_at && Date.now() - new Date(b.reminder_sent_at).getTime() < 3 * 86_400_000;
        if (!recent) kind = "bald";
      } else if (toDeadline <= -2 && !logged.has(`${b.id}:ansage_erinnerung_frist`)) {
        kind = "ueberfaellig";
      }
      if (!kind) continue;
      let sent = false;
      if (!dryRun) {
        const mb = toMailBooking(b);
        const mail = greetingReminderMail(mb, deadlineISO, kind === "ueberfaellig");
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) {
          await logActivity(
            b.id,
            kind === "bald" ? "ansage_erinnerung" : "ansage_erinnerung_frist",
            mailLog(b, mail.subject, kind === "bald" ? `Begrüßungsansage fehlt noch, Frist ${dateDE(deadlineISO)}.` : `Begrüßungsansage fehlt, Frist ${dateDE(deadlineISO)} überschritten – Event am ${dateDE(b.event_date)}.`)
          );
          if (kind === "ueberfaellig" && process.env.ADMIN_EMAIL) await sendEmail({ to: process.env.ADMIN_EMAIL, ...greetingAdminMail(mb, deadlineISO) });
        }
      }
      if (sent || dryRun) mailedToday.add(b.id);
      result.greetingReminders.push({ booking: b.booking_code, kind, sent });
    }
  }

  // ---- Gästebuch-Spiel: an den QR-Aufsteller erinnern ----
  // Einmalig 2–7 Tage vor dem Event, nur wenn das Spiel aktiv ist und der Kunde die Druckvorlage
  // noch nicht geöffnet hat. Ist heute schon eine andere Mail rausgegangen, kommt sie am Folgetag.
  const { data: gameCandidates } = await supabase
    .from("bookings")
    .select("*")
    .eq("lifecycle", "bestaetigt")
    .eq("portal_invite_pending", false)
    .not("email", "is", null)
    .gte("event_date", addDays(GAME_REMINDER_MIN_DAYS))
    .lte("event_date", addDays(GAME_REMINDER_MAX_DAYS))
    .limit(MAX_PER_RUN);
  const gameIds = (gameCandidates ?? []).map((b) => b.id);
  if (gameIds.length) {
    const [{ data: games }, { data: gameLogs }, { data: gameExtras }] = await Promise.all([
      supabase.from("guestbook_games").select("*").in("booking_id", gameIds),
      supabase.from("activity_log").select("booking_id").in("event_type", ["spiel_erinnerung", "spielkarte_geoeffnet"]).in("booking_id", gameIds),
      supabase.from("booking_extras").select("booking_id, extras(name)").in("booking_id", gameIds),
    ]);
    const gameBy = new Map(((games ?? []) as GuestbookGameRow[]).map((g) => [g.booking_id, g]));
    const done = new Set((gameLogs ?? []).map((r) => r.booking_id));
    const extraNames = new Map<string, string[]>();
    for (const r of (gameExtras ?? []) as { booking_id: string; extras: { name: string } | { name: string }[] | null }[]) {
      const list = extraNames.get(r.booking_id) ?? [];
      for (const e of Array.isArray(r.extras) ? r.extras : r.extras ? [r.extras] : []) list.push(e.name);
      extraNames.set(r.booking_id, list);
    }
    for (const b of (gameCandidates ?? []) as Booking[]) {
      if (done.has(b.id) || mailedToday.has(b.id)) continue;
      const game = gameBy.get(b.id) ?? null;
      if (!gameAccess(b, extraNames.get(b.id) ?? [], game).active) continue;
      const occasion = game?.occasion ?? occasionFromBooking(b);
      const title = game ? gameTitle(gameConfig(game)) : gameTitle({ occasion, names: namesFromBooking(b, occasion) });
      let sent = false;
      if (!dryRun) {
        const mail = gameReminderMail(toMailBooking(b), title);
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) await logActivity(b.id, "spiel_erinnerung", mailLog(b, mail.subject, `QR-Aufsteller fürs Gästebuch-Spiel noch nicht geöffnet – Event am ${dateDE(b.event_date)}.`));
      }
      if (sent || dryRun) mailedToday.add(b.id);
      result.gameReminders.push({ booking: b.booking_code, sent });
    }
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
    if (daysUntil(b.event_date) > -GALLERY_UNLOCK_DAYS || mailedToday.has(b.id)) continue;
    // Was liegt bereit? Fotos (Galerie-Link) und/oder Audios – nur das ankündigen, was gebucht und da ist
    const media = await mediaStatus(b);
    const missing = ((media.photoBooked || media.videoBooked) && !media.galleryReady) || (media.audioBooked && media.audios === 0);
    // Noch nicht alles hochgeladen: bis 14 Tage nach dem Event warten, danach Danke + Bewertung mit dem, was da ist
    if (!media.informedAt && missing && daysUntil(b.event_date) > -14) continue;
    let sent = false;
    if (!dryRun) {
      // Bewertungs-Knopf über unseren Link – so sehen wir den Klick (für die Erinnerung)
      const mail = followupMail(toMailBooking(b), reviewUrl ? reviewLink(b.id) ?? reviewUrl : null, { photos: media.photos, videos: media.videos, audios: media.audioBooked ? media.audios : 0 }, Boolean(media.informedAt));
      sent = (await sendEmail({ to: b.email!, ...mail })).sent;
      if (sent) {
        await supabase.from("bookings").update({ followup_sent_at: new Date().toISOString() }).eq("id", b.id);
        await logActivity(b.id, "nachher_mail", mailLog(b, mail.subject, `Event war am ${dateDE(b.event_date)}: ${media.informedAt ? "Danke" : [media.galleryReady && "Online-Galerie", media.audios && "Audio-Nachrichten"].filter(Boolean).join(" + ") || "Danke"}${reviewUrl ? " und Bitte um eine Google-Bewertung" : ""}.`));
      }
    }
    if (sent || dryRun) mailedToday.add(b.id);
    result.followups.push({ booking: b.booking_code, sent });
  }

  // ---- Bewertung: einmalige Erinnerung 7 Tage nach der Danke-Mail, nur wenn noch nicht geklickt ----
  if (reviewUrl) {
    const { data: noReview } = await supabase
      .from("bookings")
      .select("*")
      .eq("lifecycle", "bestaetigt")
      .not("email", "is", null)
      .is("google_review_clicked_at", null)
      .lte("followup_sent_at", new Date(Date.now() - REVIEW_REMINDER_DAYS * 86_400_000).toISOString())
      .gte("followup_sent_at", new Date(Math.max(Date.now() - (REVIEW_REMINDER_DAYS + 14) * 86_400_000, Date.parse(REVIEW_TRACKING_SINCE))).toISOString())
      .limit(MAX_PER_RUN);
    for (const b of (noReview ?? []) as Booking[]) {
      if (mailedToday.has(b.id)) continue;
      const { count } = await supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("booking_id", b.id).eq("event_type", "bewertung_erinnerung");
      if (count) continue;
      const link = reviewLink(b.id);
      if (!link) continue;
      let sent = false;
      if (!dryRun) {
        const mail = reviewReminderMail(toMailBooking(b), link);
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) await logActivity(b.id, "bewertung_erinnerung", mailLog(b, mail.subject, "Einmalige Erinnerung an die Google-Bewertung (Link aus der Danke-Mail noch nicht geöffnet)."));
      }
      if (sent || dryRun) mailedToday.add(b.id);
      result.reviewReminders.push({ booking: b.booking_code, sent });
    }
  }

  // ---- Online-Galerie: Erinnerung kurz vor dem Ablauf (mit Verlängerung +30/+60 Tage) ----
  const { data: expiring } = await supabase
    .from("event_galleries")
    .select("id, booking_id, token, expires_at, extension_days, galerie_bookings:bookings(*)")
    .is("deleted_at", null)
    .not("published_at", "is", null)
    .gte("expires_at", new Date().toISOString())
    .lte("expires_at", new Date(Date.now() + GALLERY_REMIND_DAYS * 86_400_000).toISOString())
    .limit(MAX_PER_RUN);
  const expIds = (expiring ?? []).map((g) => g.booking_id);
  const { data: expLogs } = expIds.length
    ? await supabase.from("activity_log").select("booking_id, created_at").eq("event_type", "galerie_ablauf_erinnerung").in("booking_id", expIds)
    : { data: [] as { booking_id: string; created_at: string }[] };
  for (const g of expiring ?? []) {
    const b = (Array.isArray(g.galerie_bookings) ? g.galerie_bookings[0] : g.galerie_bookings) as Booking | null;
    if (!b?.email || mailedToday.has(b.id)) continue;
    // Pro Ablauftermin nur einmal erinnern (nach einer Verlängerung gibt es eine neue Erinnerung)
    const lastLog = (expLogs ?? []).filter((l) => l.booking_id === b.id).map((l) => l.created_at).sort().at(-1);
    if (lastLog && new Date(lastLog).getTime() > new Date(g.expires_at!).getTime() - (GALLERY_REMIND_DAYS + 1) * 86_400_000) continue;
    const days = Math.max(1, Math.ceil((new Date(g.expires_at!).getTime() - Date.now()) / 86_400_000));
    const canExtend = GALLERY_EXTENSIONS.some((o) => GALLERY_DAYS + g.extension_days + o.days <= GALLERY_MAX_DAYS);
    let sent = false;
    if (!dryRun) {
      const mail = galleryExpiryMail(toMailBooking(b), { url: galleryPublicUrl(g.token), until: g.expires_at!.slice(0, 10), days, canExtend });
      sent = (await sendEmail({ to: b.email, ...mail, bookingId: b.id })).sent;
      if (sent) await logActivity(b.id, "galerie_ablauf_erinnerung", mailLog(b, mail.subject, `Online-Galerie läuft am ${dateDE(g.expires_at!.slice(0, 10))} ab${canExtend ? " – Verlängerung angeboten" : ""}.`));
    }
    if (sent || dryRun) mailedToday.add(b.id);
    result.galleryExpiry.push({ booking: b.booking_code, sent });
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
      if (already.has(b.id) || mailedToday.has(b.id)) continue;
      // gleicher Wochentag im Folgejahr
      const d = new Date(b.event_date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 364);
      const suggested = d.toISOString().slice(0, 10);
      const product = b.inquiry_items?.packages?.[0];
      const link = `${website}/anfrage.html?typ=business&datum=${suggested}${product ? `&produkt=${product.product}&paket=${product.id}` : ""}`;
      let sent = false;
      if (!dryRun) {
        const mail = rebookingMail(toMailBooking(b), suggested, link);
        sent = (await sendEmail({ to: b.email!, ...mail })).sent;
        if (sent) await logActivity(b.id, "wiederbuchung_angebot", mailLog(b, mail.subject, `Firmenkunde vom Vorjahr – Terminvorschlag ${dateDE(suggested)}.`));
      }
      result.rebookingOffers.push({ booking: b.booking_code, suggestedDate: suggested, sent });
    }
  }

  return result;
}

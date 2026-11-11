import "server-only";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { addDays, todayBerlin } from "@/lib/calendar";
import { confirmBooking, toMailBooking } from "@/lib/booking-confirm";
import { applyOffer } from "@/lib/catalog";
import { formatDateGerman } from "@/lib/format";
import { offerAdminMail, offerExpiredMail, offerMail, sendEmail, type OfferAdminEvent } from "@/lib/email";

// Angebote über das Portal (Weg B): Admin beantwortet Rückfragen / passt Positionen an,
// der Kunde nimmt über einen Link an (→ automatische Auftragsbestätigung), wünscht eine
// Änderung oder lehnt ab. Erinnerung nach 3 Tagen, nach Ablauf wird der Termin frei.
// Der Link führt auf eine Seite mit Knöpfen – Mail-Scanner, die Links „anklicken“,
// können so nichts annehmen.

export const OFFER_VALID_DAYS = [3, 7, 14] as const;
export const OFFER_DEFAULT_DAYS = 7;
const REMINDER_AFTER_DAYS = 3;
const MAX_LINES = 5;

export type OfferStatus = "offen" | "angenommen" | "aenderung" | "abgelehnt" | "abgelaufen" | "ersetzt";
export type OfferLineInput = { label: string; amount: number };

export interface Offer {
  id: string;
  booking_id: string;
  version: number;
  token: string;
  message: string;
  lines: OfferLineInput[];
  items: any;
  total: number | null;
  valid_until: string;
  status: OfferStatus;
  customer_note: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
}

const OPEN_LIFECYCLES = ["anfrage", "reserviert"];

export function offerUrl(token: string): string {
  return `${(process.env.PORTAL_URL || "").replace(/\/$/, "")}/angebot/${token}`;
}

function adminNotify(b: any, event: OfferAdminEvent, note: string | null) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return Promise.resolve();
  return sendEmail({ to, ...offerAdminMail({ ...toMailBooking(b), email: b.email, phone: b.phone }, event, note) });
}

function revalidate() {
  revalidatePath("/admin/anfragen");
  revalidatePath("/admin/dashboard");
}

/** Offene Angebote einer Buchung ungültig machen (neue Version, Admin bestätigt/lehnt direkt ab). */
export async function supersedeOpenOffers(bookingId: string) {
  await createAdminClient().from("booking_offers").update({ status: "ersetzt" }).eq("booking_id", bookingId).in("status", ["offen", "aenderung"]);
}

/** Letztes Angebot je Buchung – für die Anfragen-Übersicht im Admin. */
export async function latestOffers(bookingIds: string[]): Promise<Map<string, Offer>> {
  const map = new Map<string, Offer>();
  if (!bookingIds.length) return map;
  const { data } = await createAdminClient()
    .from("booking_offers")
    .select("*")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });
  for (const o of (data ?? []) as Offer[]) if (!map.has(o.booking_id)) map.set(o.booking_id, o);
  return map;
}

export function cleanLines(raw: unknown): OfferLineInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => ({ label: String(l?.label ?? "").trim().slice(0, 80), amount: Math.round(Number(String(l?.amount ?? "").replace(",", ".")) * 100) / 100 }))
    .filter((l) => l.label && Number.isFinite(l.amount) && l.amount !== 0 && Math.abs(l.amount) <= 10000)
    .slice(0, MAX_LINES);
}

/** Admin: Angebot erstellen bzw. neue Version schicken. Positionen landen wie Extras in der Buchung. */
export async function createOffer(
  bookingId: string,
  input: { message: string; lines: OfferLineInput[]; days: number }
): Promise<{ error?: string; mailSent?: boolean; url?: string }> {
  const supabase = createAdminClient();
  const [{ data: b }, { count: signed }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
  ]);
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!OPEN_LIFECYCLES.includes(b.lifecycle)) return { error: "Angebote gehen nur für offene Anfragen." };
  if (!b.inquiry_items?.packages?.length) return { error: "Nur für Anfragen mit Paketen." };
  if (signed) return { error: "Der Vertrag ist schon unterschrieben – Änderungen bitte separat abrechnen." };
  if (!b.email) return { error: "Für diese Anfrage ist keine E-Mail-Adresse hinterlegt." };
  const message = input.message.trim().slice(0, 3000);
  // Nachricht ist freiwillig – ohne Text erscheint in der Mail ein Standardsatz
  const days = (OFFER_VALID_DAYS as readonly number[]).includes(input.days) ? input.days : OFFER_DEFAULT_DAYS;

  // Positionen in die Buchung übernehmen – wie eine Preisanpassung, bleibt bei Neuberechnungen erhalten
  const offerTerms = { ...(b.inquiry_items.offer ?? {}), lines: input.lines };
  const priced = applyOffer(b.inquiry_items, offerTerms);
  const items = { ...priced, offer: offerTerms };
  const { error: upErr } = await supabase.from("bookings").update({ inquiry_items: items, total_price: priced.total }).eq("id", bookingId);
  if (upErr) return { error: "Konnte nicht gespeichert werden." };

  const { data: prev } = await supabase.from("booking_offers").select("version").eq("booking_id", bookingId).order("version", { ascending: false }).limit(1).maybeSingle();
  await supersedeOpenOffers(bookingId);
  const version = (prev?.version ?? 0) + 1;
  const token = randomBytes(24).toString("base64url");
  const validUntil = addDays(todayBerlin(), days);
  const { error } = await supabase.from("booking_offers").insert({
    booking_id: bookingId,
    version,
    token,
    message,
    lines: input.lines,
    items,
    total: priced.total ?? null,
    valid_until: validUntil,
  });
  if (error) return { error: "Angebot konnte nicht gespeichert werden." };

  const url = offerUrl(token);
  const mb = { ...toMailBooking(b), inquiry_items: items, total_price: priced.total ?? null };
  const r = await sendEmail({ to: b.email, ...offerMail(mb, { message, validUntil, url, version, reserved: b.lifecycle === "reserviert" }) });
  await logActivity(
    bookingId,
    "angebot_gesendet",
    `Angebot${version > 1 ? ` (Version ${version})` : ""} gesendet – gültig bis ${formatDateGerman(validUntil)}${r.sent ? ` – 📧 an ${b.email}` : " (keine E-Mail verschickt)"}`
  );
  revalidate();
  return { mailSent: r.sent, url };
}

/** Admin: Vorschau der Angebots-Mail – berechnet wie createOffer, speichert und sendet aber nichts. */
export async function previewOfferMail(
  bookingId: string,
  input: { message: string; lines: OfferLineInput[]; days: number }
): Promise<{ error?: string; subject?: string; html?: string; to?: string }> {
  const supabase = createAdminClient();
  const [{ data: b }, { data: prev }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("booking_offers").select("version").eq("booking_id", bookingId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!b.inquiry_items?.packages?.length) return { error: "Nur für Anfragen mit Paketen." };
  const days = (OFFER_VALID_DAYS as readonly number[]).includes(input.days) ? input.days : OFFER_DEFAULT_DAYS;
  const offerTerms = { ...(b.inquiry_items.offer ?? {}), lines: input.lines };
  const priced = applyOffer(b.inquiry_items, offerTerms);
  const items = { ...priced, offer: offerTerms };
  const mb = { ...toMailBooking(b), inquiry_items: items, total_price: priced.total ?? null };
  const mail = offerMail(mb, {
    message: input.message.trim().slice(0, 3000),
    validUntil: addDays(todayBerlin(), days),
    url: "#vorschau",
    version: (prev?.version ?? 0) + 1,
    reserved: b.lifecycle === "reserviert",
  });
  return { subject: mail.subject, html: mail.html, to: b.email ?? undefined };
}

/** Angebot über den Link laden (Kundenseite). */
export async function offerByToken(token: string): Promise<{ offer: Offer; booking: any } | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const supabase = createAdminClient();
  const { data: offer } = await supabase.from("booking_offers").select("*").eq("token", token).maybeSingle();
  if (!offer) return null;
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", offer.booking_id).maybeSingle();
  return booking ? { offer: offer as Offer, booking } : null;
}

/** Ist das Angebot noch beantwortbar? (offen, nicht abgelaufen, Anfrage noch offen) */
export function offerIsOpen(o: Offer, b: any): boolean {
  return o.status === "offen" && o.valid_until >= todayBerlin() && OPEN_LIFECYCLES.includes(b.lifecycle);
}

export async function markOfferViewed(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("booking_offers").update({ viewed_at: new Date().toISOString() }).eq("token", token).is("viewed_at", null).select("booking_id, version");
  if (data?.[0]) await logActivity(data[0].booking_id, "angebot_angesehen", `Kunde hat das Angebot${data[0].version > 1 ? ` (Version ${data[0].version})` : ""} angesehen`);
}

export type OfferAnswer = "annehmen" | "aenderung" | "ablehnen";

/** Antwort des Kunden. Ergebnis für die Kundenseite. */
export async function answerOffer(
  token: string,
  answer: OfferAnswer,
  note: string
): Promise<{ error?: string; result?: "bestaetigt" | "angenommen" | "aenderung" | "abgelehnt" }> {
  const found = await offerByToken(token);
  if (!found) return { error: "Dieses Angebot gibt es nicht (mehr)." };
  const { offer, booking: b } = found;
  if (!offerIsOpen(offer, b)) return { error: "Dieses Angebot kann nicht mehr beantwortet werden." };
  const text = note.trim().slice(0, 2000) || null;
  if (answer === "aenderung" && !text) return { error: "Bitte kurz schreiben, was wir ändern sollen." };

  const status: OfferStatus = answer === "annehmen" ? "angenommen" : answer === "aenderung" ? "aenderung" : "abgelehnt";
  const supabase = createAdminClient();
  // Nur einmal beantworten (Doppelklick / zwei Tabs)
  const { data: updated } = await supabase
    .from("booking_offers")
    .update({ status, customer_note: text, responded_at: new Date().toISOString(), viewed_at: offer.viewed_at ?? new Date().toISOString() })
    .eq("id", offer.id)
    .eq("status", "offen")
    .select("id");
  if (!updated?.length) return { error: "Dieses Angebot wurde schon beantwortet." };

  if (answer === "annehmen") {
    await logActivity(b.id, "angebot_angenommen", `Kunde hat das Angebot${offer.version > 1 ? ` (Version ${offer.version})` : ""} angenommen`);
    const res = await confirmBooking(b.id, { via: "angebot" });
    await adminNotify(b, res.success ? "bestaetigt" : "angenommen_belegt", text);
    revalidate();
    return { result: res.success ? "bestaetigt" : "angenommen" };
  }
  if (answer === "aenderung") {
    await logActivity(b.id, "angebot_aenderung", `Änderungswunsch zum Angebot: ${text!.slice(0, 160)}`);
    await adminNotify(b, "aenderung", text);
    revalidate();
    return { result: "aenderung" };
  }
  await supabase.from("bookings").update({ lifecycle: "abgelehnt", declined_at: new Date().toISOString() }).eq("id", b.id).in("lifecycle", OPEN_LIFECYCLES);
  await logActivity(b.id, "angebot_abgelehnt", `Kunde hat das Angebot abgelehnt${text ? `: ${text.slice(0, 160)}` : ""}`);
  await adminNotify(b, "abgelehnt", text);
  revalidate();
  return { result: "abgelehnt" };
}

/** Täglich: Erinnerung nach 3 Tagen ohne Antwort, abgelaufene Angebote schließen (Termin frei). */
export async function runOfferJobs(dryRun: boolean): Promise<{ offerReminders: string[]; offersExpired: string[] }> {
  const supabase = createAdminClient();
  const today = todayBerlin();
  const result = { offerReminders: [] as string[], offersExpired: [] as string[] };
  const { data } = await supabase.from("booking_offers").select("*").eq("status", "offen");
  const offers = (data ?? []) as Offer[];
  if (!offers.length) return result;
  const { data: rows } = await supabase.from("bookings").select("*").in("id", Array.from(new Set(offers.map((o) => o.booking_id))));
  const bookings = new Map((rows ?? []).map((b: any) => [b.id, b]));

  for (const o of offers) {
    const b = bookings.get(o.booking_id);
    if (!b) continue;
    // Anfrage wurde anderweitig erledigt (Admin hat bestätigt/abgelehnt) → Angebot nur noch Archiv
    if (!OPEN_LIFECYCLES.includes(b.lifecycle)) {
      if (!dryRun) await supabase.from("booking_offers").update({ status: "ersetzt" }).eq("id", o.id);
      continue;
    }
    if (o.valid_until < today) {
      result.offersExpired.push(b.booking_code);
      if (dryRun) continue;
      await supabase.from("booking_offers").update({ status: "abgelaufen" }).eq("id", o.id).eq("status", "offen");
      await supabase.from("bookings").update({ lifecycle: "abgelehnt", declined_at: new Date().toISOString() }).eq("id", b.id).in("lifecycle", OPEN_LIFECYCLES);
      if (b.email) await sendEmail({ to: b.email, ...offerExpiredMail(toMailBooking(b)) });
      await logActivity(b.id, "angebot_abgelaufen", "Angebot abgelaufen – Termin wieder freigegeben");
      await adminNotify(b, "abgelaufen", null);
      continue;
    }
    const age = (Date.parse(today) - Date.parse(o.created_at.slice(0, 10))) / 86_400_000;
    if (!o.reminder_sent_at && age >= REMINDER_AFTER_DAYS && o.valid_until > today && b.email) {
      result.offerReminders.push(b.booking_code);
      if (dryRun) continue;
      const mb = { ...toMailBooking(b), inquiry_items: o.items ?? b.inquiry_items, total_price: o.total ?? b.total_price };
      const r = await sendEmail({ to: b.email, ...offerMail(mb, { message: o.message, validUntil: o.valid_until, url: offerUrl(o.token), version: o.version, reserved: b.lifecycle === "reserviert" }, { reminder: true }) });
      await supabase.from("booking_offers").update({ reminder_sent_at: new Date().toISOString() }).eq("id", o.id);
      await logActivity(b.id, "angebot_erinnerung", `Erinnerung zum Angebot${r.sent ? ` – 📧 an ${b.email}` : " (keine E-Mail verschickt)"}`);
    }
  }
  if (!dryRun) revalidate();
  return result;
}

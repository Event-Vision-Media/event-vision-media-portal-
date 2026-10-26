"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { PICKUP_OPTIONS, STAFF_INCLUDED_HOURS, STAFF_MAX_EXTRA_HOURS, staffFor, travelFor, withLogistics, withStaffHours, applyOffer } from "@/lib/catalog";

export interface LogisticsActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Admin korrigiert Entfernung (km) bzw. Abholzeit einer Website-Buchung –
 * Fahrtkosten, Nachtabholung und Gesamtpreis werden neu berechnet.
 * Nach der Vertragsunterschrift nicht mehr möglich (Vertrag ist fix).
 */
export async function updateLogistics(bookingId: string, formData: FormData): Promise<LogisticsActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const [{ data: b }, { count }] = await Promise.all([
    supabase.from("bookings").select("inquiry_items").eq("id", bookingId).single(),
    supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
  ]);
  if (!b?.inquiry_items?.packages) return { error: "Nur für Buchungen über die Website." };
  if (count) return { error: "Der Vertrag ist schon unterschrieben – Änderungen bitte separat abrechnen." };

  const kmRaw = String(formData.get("km") ?? "").trim().replace(",", ".");
  const km = kmRaw === "" ? null : Number(kmRaw);
  if (km != null && (!Number.isFinite(km) || km < 0 || km > 1000)) return { error: "Bitte eine gültige Kilometerzahl eingeben." };
  const pickupRaw = String(formData.get("pickup") ?? "");
  const pickup = PICKUP_OPTIONS.some((o) => o.id === pickupRaw) ? pickupRaw : null;

  const travel = km == null ? travelFor(null) : { ...travelFor(km), manual: true };
  const items = applyOffer(withLogistics(b.inquiry_items, pickup, travel), b.inquiry_items.offer);
  const { error } = await supabase.from("bookings").update({ inquiry_items: items, total_price: items.total }).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(bookingId, "logistik_geaendert", `Anfahrt ${km == null ? "offen" : `${Math.round(km)} km`}, Abholung ${PICKUP_OPTIONS.find((o) => o.id === pickup)?.short ?? "offen"}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/anfragen");
  return { success: true };
}

/**
 * Admin bestätigt die Betreuungsdauer (z. B. nach Wunsch des Kunden):
 * Zusatzstunden werden berechnet, Gesamtpreis neu. Nach der
 * Vertragsunterschrift nicht mehr möglich (Vertrag ist fix).
 */
export async function updateStaffHours(bookingId: string, formData: FormData): Promise<LogisticsActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const [{ data: b }, { count }] = await Promise.all([
    supabase.from("bookings").select("inquiry_items").eq("id", bookingId).single(),
    supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
  ]);
  if (!b?.inquiry_items?.packages || !staffFor(b.inquiry_items)) return { error: "Für diese Buchung ist keine Betreuung gebucht." };
  if (count) return { error: "Der Vertrag ist schon unterschrieben – Zusatzstunden bitte separat abrechnen." };

  const hours = Math.round(Number(formData.get("hours")));
  if (!Number.isFinite(hours) || hours < STAFF_INCLUDED_HOURS || hours > STAFF_INCLUDED_HOURS + STAFF_MAX_EXTRA_HOURS) {
    return { error: `Bitte ${STAFF_INCLUDED_HOURS}–${STAFF_INCLUDED_HOURS + STAFF_MAX_EXTRA_HOURS} Stunden angeben.` };
  }
  const items = withStaffHours(b.inquiry_items, hours);
  const { error } = await supabase.from("bookings").update({ inquiry_items: items, total_price: items.total }).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(bookingId, "betreuung_geaendert", `Betreuung auf ${hours} Std. festgelegt`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/anfragen");
  return { success: true };
}

/**
 * Admin vereinbart einen Sonderpreis (z. B. per WhatsApp): neuer Gesamtpreis → die Differenz
 * steht als eigene Zeile („Nachlass …“) in Buchung, Bestätigungsmail, Portal und Vertrag.
 * Leeres Feld entfernt die Anpassung. Nach der Vertragsunterschrift nicht mehr möglich.
 */
export async function updatePriceAdjustment(bookingId: string, formData: FormData): Promise<LogisticsActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const [{ data: b }, { count }] = await Promise.all([
    supabase.from("bookings").select("inquiry_items").eq("id", bookingId).single(),
    supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
  ]);
  if (!b?.inquiry_items?.packages) return { error: "Nur für Buchungen mit Paketen." };
  if (count) return { error: "Der Vertrag ist schon unterschrieben – Preisänderungen bitte separat abrechnen." };

  const offer = b.inquiry_items.offer ?? {};
  const base = applyOffer(b.inquiry_items, { ...offer, adjustment: null });
  const raw = String(formData.get("target") ?? "").trim().replace(",", ".");
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || "Nachlass (persönlich vereinbart)";

  let adjustment: { label: string; amount: number } | null = null;
  if (raw !== "") {
    const target = Number(raw);
    if (!Number.isFinite(target) || target < 0) return { error: "Bitte einen gültigen Gesamtpreis eingeben." };
    const amount = Math.round((target - (base.total ?? 0)) * 100) / 100;
    if (amount !== 0) adjustment = { label: amount < 0 ? label : label.replace(/^Nachlass/, "Aufpreis"), amount };
  }
  const items = applyOffer(base, { ...offer, adjustment });
  const { error } = await supabase
    .from("bookings")
    .update({ inquiry_items: { ...items, offer: { ...offer, adjustment } }, total_price: items.total })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(
    bookingId,
    "preis_angepasst",
    adjustment
      ? `Preis angepasst: ${adjustment.label} ${adjustment.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} → Gesamt ${Number(items.total).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`
      : "Preisanpassung entfernt – wieder Normalpreis"
  );
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/anfragen");
  revalidatePath("/dashboard");
  return { success: true };
}

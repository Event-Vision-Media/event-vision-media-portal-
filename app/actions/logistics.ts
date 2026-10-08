"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { PICKUP_OPTIONS, STAFF_INCLUDED_HOURS, STAFF_MAX_EXTRA_HOURS, staffFor, travelFor, withLogistics, withStaffHours } from "@/lib/catalog";

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
  const items = withLogistics(b.inquiry_items, pickup, travel);
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

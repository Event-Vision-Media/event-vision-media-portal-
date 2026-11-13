"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { FULL_PAYMENT_DAYS } from "@/lib/contract";

/**
 * Zahlungsweise einer Buchung: Standard (Anzahlung + Rest) oder – mit dem Kunden vereinbart –
 * Gesamtbetrag auf einmal, fällig 7 bzw. 14 Tage vor der Veranstaltung. Nur solange kein
 * digitaler Vertrag unterschrieben und noch nichts bezahlt ist.
 */
export async function setPaymentTerms(bookingId: string, mode: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const days = mode === "standard" ? null : Number(mode.replace("full", ""));
  if (days !== null && !(FULL_PAYMENT_DAYS as readonly number[]).includes(days)) return { error: "Ungültige Auswahl." };

  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("inquiry_items, deposit_paid_at, rest_paid_at").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (b.deposit_paid_at || b.rest_paid_at) return { error: "Es ist schon eine Zahlung abgehakt – die Zahlungsweise lässt sich nicht mehr ändern." };
  const { count } = await supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  if (count) return { error: "Der Mietvertrag ist schon unterschrieben – die Zahlungsbedingungen stehen darin fest." };

  const items = { ...(b.inquiry_items ?? {}), payment: days ? { full: true, dueDays: days } : null };
  const { error } = await supabase.from("bookings").update({ inquiry_items: items, deposit_amount: null }).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(bookingId, "zahlungsweise_geaendert", days ? `Zahlungsweise: Gesamtbetrag auf einmal, fällig ${days} Tage vor der Veranstaltung (keine Anzahlung)` : "Zahlungsweise: Standard (Anzahlung + Restbetrag)");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

export interface PaymentActionResult {
  success?: boolean;
  error?: string;
}

/** Admin hakt Anzahlung bzw. Restbetrag als erhalten ab (oder nimmt den Haken zurück). */
export async function setPaymentReceived(bookingId: string, kind: "deposit" | "rest", received: boolean): Promise<PaymentActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const column = kind === "deposit" ? "deposit_paid_at" : "rest_paid_at";
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ [column]: received ? new Date().toISOString() : null })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(
    bookingId,
    received ? "zahlung_erhalten" : "zahlung_zurueckgesetzt",
    `${kind === "deposit" ? "Anzahlung" : "Restbetrag"} ${received ? "als erhalten markiert" : "wieder auf offen gesetzt"}`
  );
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true };
}

/** Admin ändert die Zahlungsart für den Restbetrag (z. B. nach Absprache am Telefon). */
export async function setRestPaymentMethod(bookingId: string, method: "ueberweisung" | "bar" | null): Promise<PaymentActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  if (method !== null && method !== "ueberweisung" && method !== "bar") return { error: "Ungültige Zahlungsart." };
  const { error } = await createAdminClient().from("bookings").update({ rest_payment_method: method }).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true };
}

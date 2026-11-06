"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { paymentCompleteMail, sendEmail } from "@/lib/email";
import { toMailBooking } from "@/lib/booking-confirm";
import { getPaymentSummary } from "@/lib/payments";
import type { Booking } from "@/lib/types";

export interface PaymentActionResult {
  success?: boolean;
  error?: string;
}

/** Admin hakt Anzahlung bzw. Restbetrag als erhalten ab (oder nimmt den Haken zurück). */
export async function setPaymentReceived(bookingId: string, kind: "deposit" | "rest", received: boolean): Promise<PaymentActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  const p = await getPaymentSummary(b as Booking);
  const update: Record<string, unknown> =
    kind === "deposit"
      ? { deposit_paid_at: received ? new Date().toISOString() : null }
      : received
        ? // Rest bzw. Nachzahlung erhalten: aktuellen Gesamtbetrag als bezahlt merken
          { rest_paid_at: b.rest_paid_at ?? new Date().toISOString(), rest_paid_amount: p.total, rest_paid_lines: p.lines }
        : { rest_paid_at: null, rest_paid_amount: null, rest_paid_lines: null };
  const { error } = await supabase.from("bookings").update(update).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(
    bookingId,
    received ? "zahlung_erhalten" : "zahlung_zurueckgesetzt",
    `${kind === "deposit" ? "Anzahlung" : p.followUp ? `Nachzahlung (${p.rest} €)` : "Restbetrag"} ${received ? "als erhalten markiert" : "wieder auf offen gesetzt"}`
  );
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true };
}

/** Admin ändert die Zahlungsart für den Restbetrag (z. B. nach Absprache am Telefon). */
export async function setRestPaymentMethod(bookingId: string, method: "ueberweisung" | "bar" | null): Promise<PaymentActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  if (method !== null && method !== "ueberweisung" && method !== "bar") return { error: "Ungültige Zahlungsart." };
  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  const p = await getPaymentSummary(b as Booking);
  const { error } = await supabase.from("bookings").update(p.followUp ? { extra_payment_method: method } : { rest_payment_method: method }).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true };
}

/**
 * Gesamtbetrag auf einmal erhalten (z. B. Kunde überweist alles vorab): Anzahlung und Rest abhaken,
 * optional Bestätigung per E-Mail. Mit onlyMail: nur die Bestätigung (erneut) schicken.
 */
export async function markFullyPaid(bookingId: string, sendMail: boolean, onlyMail = false): Promise<PaymentActionResult & { mailSent?: boolean }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };

  if (!onlyMail) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update({ deposit_paid_at: b.deposit_paid_at ?? now, rest_paid_at: b.rest_paid_at ?? now, rest_payment_method: b.rest_payment_method ?? "ueberweisung", ...(await getPaymentSummary(b as Booking).then((s) => ({ rest_paid_amount: s.total, rest_paid_lines: s.lines }))) })
      .eq("id", bookingId);
    if (error) return { error: "Konnte nicht gespeichert werden." };
    await logActivity(bookingId, "zahlung_erhalten", "Gesamtbetrag als vollständig erhalten markiert");
  }

  let mailSent = false;
  if (sendMail) {
    if (!b.email) return { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." };
    const p = await getPaymentSummary(b as Booking);
    const mail = paymentCompleteMail(toMailBooking(b), p.total);
    const r = await sendEmail({ to: b.email, ...mail });
    mailSent = r.sent;
    if (!r.sent) return { error: "Gespeichert, aber die Mail konnte nicht verschickt werden – bitte später erneut versuchen." };
    await logActivity(bookingId, "mail_zahlung_komplett", `📧 Mail an ${b.customer_name || b.couple_names} (${b.email}): „${mail.subject}“ – Zahlung vollständig erhalten.`);
  }
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  return { success: true, mailSent };
}

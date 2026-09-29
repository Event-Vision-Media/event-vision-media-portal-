"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { checkDeviceAvailability, generateAccessCode } from "@/lib/inquiry-server";
import { isUniqueViolation } from "@/lib/supabase/errors";
import { confirmationMail, declineMail, sendEmail, type MailBooking } from "@/lib/email";
import type { DeviceKey } from "@/lib/catalog";

export interface InquiryActionResult {
  success?: boolean;
  error?: string;
  mailSent?: boolean;
}

function toMailBooking(b: any): MailBooking {
  return {
    booking_code: b.booking_code,
    customer_type: b.customer_type ?? null,
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

/**
 * Bestätigt eine Website-Reservierung bzw. -Anfrage: prüft die Verfügbarkeit
 * erneut, setzt lifecycle = bestaetigt und verschickt die Auftragsbestätigung
 * mit Portal-Zugang.
 */
export async function confirmInquiry(bookingId: string, force = false): Promise<InquiryActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!["anfrage", "reserviert"].includes(b.lifecycle)) return { error: "Diese Anfrage wurde bereits bearbeitet." };

  if (!force) {
    const devices = ((b.inquiry_items?.packages ?? []) as { product: DeviceKey }[]).map((p) => p.product);
    const { available } = await checkDeviceAvailability(devices, b.event_date, b.event_days ?? 1, b.id);
    if (!available) {
      return { error: "Ein Gerät ist an diesem Termin bereits belegt. Trotzdem bestätigen?" };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "bestaetigt", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  // Bestätigung = Gegenzeichnung eines bereits unterschriebenen Mietvertrags
  await supabase
    .from("booking_contracts")
    .update({ countersigned_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("countersigned_at", null);

  let mailSent = false;
  if (b.email) {
    const m = confirmationMail(toMailBooking(b));
    mailSent = (await sendEmail({ to: b.email, ...m })).sent;
  }
  await logActivity(bookingId, "anfrage_bestaetigt", `Buchung bestätigt${mailSent ? " – Auftragsbestätigung verschickt" : " (keine E-Mail verschickt)"}`);

  revalidatePath("/admin/anfragen");
  revalidatePath("/admin/dashboard");
  return { success: true, mailSent };
}

/** Lehnt eine Anfrage ab (optional mit freundlicher Absage-Mail). */
export async function declineInquiry(
  bookingId: string,
  sendMail: boolean,
  reason: string
): Promise<InquiryActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!["anfrage", "reserviert"].includes(b.lifecycle)) return { error: "Diese Anfrage wurde bereits bearbeitet." };

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "abgelehnt", declined_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  let mailSent = false;
  if (sendMail && b.email) {
    const m = declineMail(toMailBooking(b), reason.trim().slice(0, 500) || null);
    mailSent = (await sendEmail({ to: b.email, ...m })).sent;
  }
  await logActivity(bookingId, "anfrage_abgelehnt", `Anfrage abgelehnt${mailSent ? " – Absage verschickt" : ""}`);

  revalidatePath("/admin/anfragen");
  return { success: true, mailSent };
}

/**
 * Erzeugt einen neuen Zugangscode für eine Buchung (z. B. wenn ein Code
 * weitergegeben wurde). Der alte Code funktioniert danach nicht mehr.
 */
export async function regenerateAccessCode(bookingId: string): Promise<InquiryActionResult & { code?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateAccessCode();
    const { error } = await supabase.from("bookings").update({ access_code: code }).eq("id", bookingId);
    if (!error) {
      await logActivity(bookingId, "zugangscode_neu", "Neuer Zugangscode erzeugt");
      revalidatePath(`/admin/bookings/${bookingId}`);
      return { success: true, code };
    }
    if (!isUniqueViolation(error)) break;
  }
  return { error: "Zugangscode konnte nicht erzeugt werden." };
}

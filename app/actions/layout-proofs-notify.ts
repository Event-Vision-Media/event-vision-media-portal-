"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { layoutProofsMail, sendEmail } from "@/lib/email";
import { toMailBooking } from "@/lib/booking-confirm";
import { pendingProofs } from "@/lib/layout-proofs-pending";

/** Admin: Kunden per Mail informieren, dass Layout-Entwürfe (bzw. der Startbildschirm) zur Ansicht im Portal liegen. */
export async function sendLayoutProofsReady(bookingId: string): Promise<{ success?: boolean; error?: string; subject?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { data: b } = await createAdminClient().from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!b.email) return { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." };
  const p = await pendingProofs(bookingId);
  if (!p.layouts.length && !p.screen) return { error: "Es wartet gerade kein Entwurf auf Freigabe – erst hochladen." };
  const mail = layoutProofsMail(toMailBooking(b), p);
  const r = await sendEmail({ to: b.email, ...mail });
  if (!r.sent) return { error: "Die Mail konnte nicht verschickt werden. Bitte später erneut versuchen." };
  await logActivity(bookingId, "mail_layouts", `📧 Mail an ${b.customer_name || b.couple_names} (${b.email}): „${mail.subject}“ – von dir verschickt.`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true, subject: mail.subject };
}

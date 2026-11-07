"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { mediaReadyMail, sendEmail } from "@/lib/email";
import { toMailBooking } from "@/lib/booking-confirm";
import { mediaStatus } from "@/lib/media-ready";
import type { Booking } from "@/lib/types";

/** Admin: Kunden informieren, dass Fotos und/oder Audios bereitliegen. */
export async function sendMediaReady(bookingId: string): Promise<{ success?: boolean; error?: string; subject?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const { data: b } = await createAdminClient().from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!b.email) return { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." };
  const m = await mediaStatus(b as Booking);
  const ready = { photos: m.photos, videos: m.videos, audios: m.audioBooked ? m.audios : 0 };
  if (!ready.photos && !ready.videos && !ready.audios) return { error: "Es liegt noch nichts bereit – erst Galerie-Link eintragen bzw. Audios hochladen." };
  const mail = mediaReadyMail(toMailBooking(b), ready);
  const r = await sendEmail({ to: b.email, ...mail });
  if (!r.sent) return { error: "Die Mail konnte nicht verschickt werden. Bitte später erneut versuchen." };
  await logActivity(bookingId, "mail_bereit", `📧 Mail an ${b.customer_name || b.couple_names} (${b.email}): „${mail.subject}“ – von dir verschickt.`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true, subject: mail.subject };
}

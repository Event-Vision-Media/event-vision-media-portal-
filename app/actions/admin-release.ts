"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { supersedeOpenOffers } from "@/lib/offers";
import { formatDateGerman } from "@/lib/format";
import { sendPersonalMail } from "@/app/actions/personal-mail";

/**
 * Bestätigte Buchung ohne Vertrag und ohne Zahlung stornieren („Termin freigeben“), z. B. wenn
 * der Kunde sich trotz Frist nicht mehr meldet. Optional mit persönlicher Freigabe-Mail.
 * Danach: Termin frei, kein Portal-Zugang, keine automatischen Erinnerungen mehr.
 */
export async function releaseBooking(
  bookingId: string,
  mail: { subject: string; body: string } | null
): Promise<{ success?: boolean; mailSent?: boolean; test?: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const [{ data: b }, { count: signed }] = await Promise.all([
    supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle(),
    supabase.from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
  ]);
  if (!b) return { error: "Buchung nicht gefunden." };
  if (b.lifecycle !== "bestaetigt") return { error: "Nur bestätigte Buchungen können hier freigegeben werden." };
  if (signed || b.contract_on_file) return { error: "Der Vertrag ist unterschrieben – bitte als Stornierung nach Vertrag behandeln." };
  if (b.deposit_paid_at || b.rest_paid_at) return { error: "Es ist bereits eine Zahlung eingegangen – bitte erst die Rückzahlung klären." };
  if (mail && !b.email) return { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." };

  // Erst die Mail (kann scheitern) – dann stornieren, damit nichts halb passiert
  let mailSent = false;
  let test = false;
  if (mail) {
    const r = await sendPersonalMail(bookingId, mail.subject, mail.body, false);
    if (r.error) return { error: r.error };
    mailSent = Boolean(r.success);
    test = Boolean(r.test);
  }

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "storniert", declined_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("lifecycle", "bestaetigt");
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await supersedeOpenOffers(bookingId);
  await logActivity(
    bookingId,
    "buchung_storniert",
    `Buchung storniert – Termin ${formatDateGerman(b.event_date)} freigegeben (ohne Vertrag, keine Rückmeldung)${mailSent ? ` – ✉️ Freigabe-Mail an ${b.email}` : ""}`
  );

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/anfragen");
  revalidatePath("/admin/uebersicht");
  revalidatePath("/admin/kalender");
  return { success: true, mailSent, test };
}

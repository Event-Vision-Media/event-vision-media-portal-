import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { checkDeviceAvailability } from "@/lib/inquiry-server";
import { confirmationMail, portalInviteMail, sendEmail, type MailBooking } from "@/lib/email";
import type { DeviceKey } from "@/lib/catalog";

// Bestätigung einer Website-Anfrage – gemeinsam für den Admin-Knopf „Bestätigen“
// und das angenommene Angebot (automatische Bestätigung). Prüft keine Anmeldung:
// Aufrufer müssen selbst sicherstellen, dass sie dürfen (Admin bzw. gültiger Angebots-Link).

export function toMailBooking(b: any): MailBooking {
  return {
    booking_code: b.booking_code,
    confirmed_at: b.confirmed_at ?? null,
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

export async function confirmBooking(
  bookingId: string,
  opts: { force?: boolean; via?: "admin" | "angebot" } = {}
): Promise<{ success?: boolean; error?: string; mailSent?: boolean; busy?: boolean }> {
  const supabase = createAdminClient();

  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!["anfrage", "reserviert"].includes(b.lifecycle)) return { error: "Diese Anfrage wurde bereits bearbeitet." };

  if (!opts.force) {
    const devices = ((b.inquiry_items?.packages ?? []) as { product: DeviceKey }[]).map((p) => p.product);
    const { available } = await checkDeviceAvailability(devices, b.event_date, b.event_days ?? 1, b.id);
    if (!available) {
      return { error: "Ein Gerät ist an diesem Termin bereits belegt. Trotzdem bestätigen?", busy: true };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ lifecycle: "bestaetigt", confirmed_at: new Date().toISOString(), portal_invite_pending: false })
    .eq("id", bookingId)
    .in("lifecycle", ["anfrage", "reserviert"]);
  if (error) return { error: "Konnte nicht gespeichert werden." };

  // Bestätigung = Gegenzeichnung eines bereits unterschriebenen Mietvertrags
  await supabase
    .from("booking_contracts")
    .update({ countersigned_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("countersigned_at", null);

  let mailSent = false;
  let mailId: string | undefined;
  if (b.email) {
    // Liegt der Vertrag schon vor (Bestandsbuchung), keine Aufforderung zum Unterschreiben
    const m = b.contract_on_file ? portalInviteMail(toMailBooking(b), { contractOnFile: true }) : confirmationMail(toMailBooking(b));
    const r = await sendEmail({ to: b.email, ...m });
    mailSent = r.sent;
    mailId = r.id;
  }
  const how = opts.via === "angebot" ? "Angebot angenommen – automatisch bestätigt" : "Buchung bestätigt";
  await logActivity(bookingId, "anfrage_bestaetigt", `${how}${mailSent ? ` – 📧 ${b.contract_on_file ? "Portal-Zugang (Vertrag liegt vor)" : "Auftragsbestätigung mit Portal-Zugang"} an ${b.email}` : " (keine E-Mail verschickt)"}`);
  if (mailId) await logActivity(bookingId, "mail_bestaetigung", mailId);

  revalidatePath("/admin/anfragen");
  revalidatePath("/admin/dashboard");
  return { success: true, mailSent };
}

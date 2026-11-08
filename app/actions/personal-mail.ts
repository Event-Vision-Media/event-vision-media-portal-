"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { personalMail, sendEmail } from "@/lib/email";
import { toMailBooking } from "@/lib/booking-confirm";
import { PERSONAL_MAIL, PERSONAL_MAIL_META } from "@/lib/personal-mail-server";

const MAX_SUBJECT = 200;
const MAX_BODY = 8000;

function portalBase(): string {
  return (process.env.PORTAL_URL || "").replace(/\/$/, "");
}

function clean(subject: string, body: string): { subject: string; body: string } | { error: string } {
  const s = subject.replace(/[\r\n]+/g, " ").trim();
  const t = body.replace(/\r/g, "").trim();
  if (!s) return { error: "Bitte einen Betreff eingeben." };
  if (!t) return { error: "Bitte einen Text eingeben." };
  if (s.length > MAX_SUBJECT) return { error: "Der Betreff ist zu lang." };
  if (t.length > MAX_BODY) return { error: "Der Text ist zu lang." };
  return { subject: s, body: t };
}

/** Vorschau genau so, wie der Kunde die Mail sieht (Link nur als Platzhalter). */
export async function previewPersonalMail(bookingId: string, subject: string, body: string, withPortal: boolean): Promise<{ html?: string; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const c = clean(subject, body);
  if ("error" in c) return c;
  const { data: b } = await createAdminClient().from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  const mail = personalMail(toMailBooking(b), c.subject, c.body, withPortal ? `${portalBase() || ""}/m/vorschau` : null);
  return { html: mail.html };
}

/** Persönliche Nachricht verschicken und im Verlauf der Buchung festhalten. */
export async function sendPersonalMail(
  bookingId: string,
  subject: string,
  body: string,
  withPortal: boolean
): Promise<{ success?: boolean; test?: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const c = clean(subject, body);
  if ("error" in c) return c;
  const supabase = createAdminClient();
  const { data: b } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return { error: "Buchung nicht gefunden." };
  if (!b.email) return { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." };

  // Erst den Verlaufseintrag anlegen – seine ID steckt im Portal-Link (/m/<id>), darüber sehen wir den Klick.
  const who = b.customer_name || b.couple_names;
  const { data: row, error: insErr } = await supabase
    .from("activity_log")
    .insert({ booking_id: bookingId, event_type: PERSONAL_MAIL, message: `✉️ Persönliche Nachricht an ${who} (${b.email}): „${c.subject}“` })
    .select("id")
    .single();
  if (insErr || !row) return { error: "Konnte die Nachricht nicht speichern. Bitte erneut versuchen." };

  const base = portalBase();
  const link = withPortal && base ? `${base}/m/${row.id}` : null;
  const mail = personalMail(toMailBooking(b), c.subject, c.body, link);
  const r = await sendEmail({ to: b.email, ...mail });

  // Test-Adresse (z. B. …@beispiel.test) oder lokal ohne Mailversand: Eintrag behalten und als Test kennzeichnen, damit der Ablauf prüfbar ist.
  const test = !r.sent && (r.error === "test_address" || (r.error === "not_configured" && process.env.NODE_ENV !== "production"));
  if (!r.sent && !test) {
    await supabase.from("activity_log").delete().eq("id", row.id);
    return { error: "Die Mail konnte nicht verschickt werden. Bitte später erneut versuchen." };
  }
  await supabase.from("activity_log").insert({
    booking_id: bookingId,
    event_type: PERSONAL_MAIL_META,
    message: JSON.stringify({ ref: row.id, resend: r.id ?? null, subject: c.subject, test }),
  });
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/uebersicht");
  return { success: true, test };
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Mail-Verlauf: jede verschickte Mail wird mit Betreff, Inhalt und Resend-ID gespeichert.
// Der Zustellstatus wird beim Ansehen im Admin direkt bei Resend nachgefragt (kein Webhook nötig).

export type MailLogStatus = "gesendet" | "fehler" | "test" | "aus";

export interface MailLogRow {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  status: MailLogStatus;
  resend_id: string | null;
  last_event: string | null;
}

/** Wird von sendEmail aufgerufen – Fehler hier dürfen den Versand nie stören. */
export async function logMail(entry: { to: string; subject: string; html: string; status: MailLogStatus; resendId?: string; bookingId?: string }) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    await createAdminClient()
      .from("mail_log")
      .insert({
        recipient: entry.to.trim(),
        subject: entry.subject.slice(0, 300),
        html: entry.html,
        status: entry.status,
        resend_id: entry.resendId ?? null,
        booking_id: entry.bookingId ?? null,
        last_event: entry.status === "gesendet" ? "sent" : null,
      });
  } catch (err) {
    console.error("[mail-log] konnte nicht gespeichert werden:", err);
  }
}

// Zwischenstände, bei denen sich ein erneutes Nachfragen lohnt
const PENDING = new Set(["sent", "queued", "scheduled", "delivery_delayed"]);
const RECHECK_MS = 10 * 60_000;
const MAX_AGE_MS = 14 * 86_400_000;
const MAX_CHECKS = 8;

async function resendEvent(id: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !/^[\w-]{8,}$/.test(id)) return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { last_event?: string };
    return j.last_event ?? null;
  } catch {
    return null;
  }
}

/** Alle Mails an den Kunden dieser Buchung (über Buchung oder E-Mail-Adresse), neueste zuerst. Offene Zustellstände werden aktualisiert. */
export async function mailHistory(bookingId: string, email: string | null): Promise<MailLogRow[]> {
  const supabase = createAdminClient();
  const cols = "id, created_at, recipient, subject, status, resend_id, last_event, checked_at";
  let q = supabase.from("mail_log").select(cols).order("created_at", { ascending: false }).limit(60);
  const addr = email?.trim().toLowerCase();
  // Nur unkritische Adressen in den Filter (Kommas/Klammern würden ihn stören), _ und % maskieren
  const like = addr && /^[^,()\s"]+@[^,()\s"]+$/.test(addr) ? addr.replace(/[\\%_]/g, (c) => `\\${c}`) : null;
  q = like ? q.or(`booking_id.eq.${bookingId},recipient.ilike.${like}`) : q.eq("booking_id", bookingId);
  const { data, error } = await q;
  if (error || !data) return [];

  const now = Date.now();
  let checks = 0;
  for (const r of data) {
    if (checks >= MAX_CHECKS) break;
    if (r.status !== "gesendet" || !r.resend_id) continue;
    if (r.last_event && !PENDING.has(r.last_event)) continue;
    if (now - Date.parse(r.created_at) > MAX_AGE_MS) continue;
    if (r.checked_at && now - Date.parse(r.checked_at) < RECHECK_MS) continue;
    checks++;
    const ev = await resendEvent(r.resend_id);
    const update: { checked_at: string; last_event?: string } = { checked_at: new Date().toISOString() };
    if (ev) {
      update.last_event = ev;
      r.last_event = ev;
    }
    await supabase.from("mail_log").update(update).eq("id", r.id);
  }
  return data.map(({ checked_at: _c, ...r }) => r as MailLogRow);
}

/** Inhalt einer gespeicherten Mail (für die Ansicht im Admin). */
export async function mailLogHtml(id: string): Promise<{ subject: string; html: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("mail_log").select("subject, html").eq("id", id).maybeSingle();
  return data ?? null;
}

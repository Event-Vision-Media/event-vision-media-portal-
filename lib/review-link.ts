import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Persönlicher Bewertungs-Link für Mails/WhatsApp: /api/bewertung/<buchungs-id>.<signatur>
 * Beim Klick merken wir uns „geklickt“ (für die Erinnerung) und leiten zu Google weiter.
 * Die Signatur verhindert, dass jemand fremde Buchungen als „geklickt“ markiert.
 */
function secret(): string {
  return process.env.REVIEW_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev";
}

function sign(bookingId: string): string {
  return createHmac("sha256", secret()).update(`bewertung:${bookingId}`).digest("base64url").slice(0, 16);
}

export function reviewToken(bookingId: string): string {
  return `${bookingId}.${sign(bookingId)}`;
}

export function reviewLink(bookingId: string): string | null {
  const base = (process.env.PORTAL_URL || "").replace(/\/$/, "");
  return base ? `${base}/api/bewertung/${reviewToken(bookingId)}` : null;
}

/** Buchungs-ID aus einem gültigen Token, sonst null. */
export function bookingFromReviewToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

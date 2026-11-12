"use server";

import { isAdminAuthenticated } from "@/lib/require-admin";
import { cleanLines, createOffer, previewOfferMail, resendOffer } from "@/lib/offers";

/** Admin: Angebot an eine offene Website-Anfrage schicken (Antwort + Positionen + Gültigkeit). */
export async function sendOffer(
  bookingId: string,
  input: { message: string; lines: { label: string; amount: string | number }[]; days: number }
): Promise<{ error?: string; mailSent?: boolean; url?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  return createOffer(bookingId, { message: String(input.message ?? ""), lines: cleanLines(input.lines), days: Number(input.days) });
}

/** Admin: Vorschau der Angebots-Mail (nichts wird gespeichert oder gesendet). */
export async function previewOffer(
  bookingId: string,
  input: { message: string; lines: { label: string; amount: string | number }[]; days: number }
): Promise<{ error?: string; subject?: string; html?: string; to?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  return previewOfferMail(bookingId, { message: String(input.message ?? ""), lines: cleanLines(input.lines), days: Number(input.days) });
}

/** Admin: offenes Angebot unverändert noch einmal an die (ggf. korrigierte) E-Mail-Adresse schicken. */
export async function resendOfferAction(bookingId: string): Promise<{ error?: string; mailSent?: boolean; to?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  return resendOffer(bookingId);
}

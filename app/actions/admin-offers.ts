"use server";

import { isAdminAuthenticated } from "@/lib/require-admin";
import { cleanLines, createOffer } from "@/lib/offers";

/** Admin: Angebot an eine offene Website-Anfrage schicken (Antwort + Positionen + Gültigkeit). */
export async function sendOffer(
  bookingId: string,
  input: { message: string; lines: { label: string; amount: string | number }[]; days: number }
): Promise<{ error?: string; mailSent?: boolean; url?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  return createOffer(bookingId, { message: String(input.message ?? ""), lines: cleanLines(input.lines), days: Number(input.days) });
}

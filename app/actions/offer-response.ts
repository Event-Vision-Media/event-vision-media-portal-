"use server";

import { answerOffer, markOfferViewed, type OfferAnswer } from "@/lib/offers";

// Kundenseite /angebot/[token]: kein Login – berechtigt ist, wer den geheimen Link hat.

export async function respondToOffer(token: string, answer: OfferAnswer, note: string) {
  if (!["annehmen", "aenderung", "ablehnen"].includes(answer)) return { error: "Ungültige Antwort." };
  return answerOffer(String(token), answer, String(note ?? ""));
}

/** Beim Öffnen der Seite im Browser (nicht beim Mail-Scanner, der kein JavaScript ausführt). */
export async function offerOpened(token: string) {
  await markOfferViewed(String(token));
}

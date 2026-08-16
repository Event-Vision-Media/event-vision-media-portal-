/**
 * Ermittelt, ob eine Buchung Zugriff auf den Audiogästebuch-Bereich hat -
 * entweder weil "Audiogästebuch" direkt das gebuchte Produkt ist, oder weil
 * es später als Exclusive Extra dazugebucht wurde.
 */
export function bookingHasAudioGuestbook(
  productType: string,
  bookedExtraNames: string[]
): boolean {
  return productType === "Audiogästebuch" || bookedExtraNames.includes("Audiogästebuch");
}

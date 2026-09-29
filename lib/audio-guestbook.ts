/**
 * Ermittelt, ob eine Buchung Zugriff auf den Audiogästebuch-Bereich hat -
 * weil "Audiogästebuch" direkt das gebuchte Produkt ist, es als Exclusive
 * Extra dazugebucht wurde oder als Paket über die Website gebucht wurde.
 */
export function bookingHasAudioGuestbook(
  productType: string,
  bookedExtraNames: string[],
  inquiryItems?: { packages?: { product: string }[] } | null
): boolean {
  return (
    productType === "Audiogästebuch" ||
    bookedExtraNames.includes("Audiogästebuch") ||
    // Website-Buchungen: Audiogästebuch als eigenes Paket (z. B. neben dem Fotospiegel)
    Boolean(inquiryItems?.packages?.some((p) => p.product === "audio"))
  );
}

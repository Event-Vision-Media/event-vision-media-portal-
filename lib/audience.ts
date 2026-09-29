// Unterschiede zwischen Privat- und Firmenkunden im Kundenportal:
// Reihenfolge der Extras/Empfehlungen und Passung zum gebuchten Gerät.
// Namen = Einträge in public.extras (Admin → Extras).

import { DEVICE_BY_PRODUCT_TYPE, EXTRAS as CATALOG_EXTRAS, type DeviceKey } from "@/lib/catalog";
import type { Booking, Extra } from "@/lib/types";

/** Was wir zuerst empfehlen – je Kundentyp (nicht genannte Extras folgen danach). */
export const EXTRA_PRIORITY: Record<"business" | "privat", string[]> = {
  business: [
    "Live-Fotogalerie auf dem Event-Monitor",
    "Betreuung vor Ort",
    "Mobiler WLAN-Router",
    "Fotobox-Schutzpaket",
    "Hintergrund",
    "Aufblasbare Fotokabine — 2,5 × 2,5 × 2,5 m",
    "Audiogästebuch",
  ],
  privat: [
    "Audiogästebuch",
    "Personalisierte USB-Stick´s mit personalisierter Holzbox",
    "XXL-LOVE Leuchtbuchstaben",
    "Aufblasbare Fotokabine — 2,5 × 2,5 × 2,5 m",
    "Hintergrund",
    "Live-Fotogalerie auf dem Event-Monitor",
    "Fotobox-Schutzpaket",
    "Mobiler WLAN-Router",
    "Betreuung vor Ort",
  ],
};

/** Extras, die wir Firmen nicht aktiv empfehlen (bleiben unter "Event Highlights" buchbar). */
const NOT_RECOMMENDED_FOR_BUSINESS = new Set([
  "Personalisierte USB-Stick´s mit personalisierter Holzbox",
  "XXL-LOVE Leuchtbuchstaben",
]);

/** Geräte der Buchung (Website-Pakete bzw. Produkt aus dem Admin). */
export function bookingDevices(b: Booking): Set<DeviceKey> {
  const set = new Set<DeviceKey>((b.inquiry_items?.packages ?? []).map((p) => p.product as DeviceKey));
  const primary = DEVICE_BY_PRODUCT_TYPE[b.product_type];
  if (primary) set.add(primary);
  return set;
}

/** Passt das Extra zum gebuchten Gerät? (z. B. kein Foto-Hintergrund bei reinem Audiogästebuch) */
export function extraFitsBooking(extra: Pick<Extra, "name">, devices: Set<DeviceKey>): boolean {
  const cat = CATALOG_EXTRAS.find((c) => c.dbExtraName === extra.name);
  if (!cat) return true; // unbekannt → nicht einschränken
  return cat.for.some((d) => devices.has(d));
}

export function sortExtrasForAudience<T extends Pick<Extra, "name">>(extras: T[], business: boolean): T[] {
  const order = EXTRA_PRIORITY[business ? "business" : "privat"];
  const rank = (n: string) => (order.includes(n) ? order.indexOf(n) : order.length);
  return [...extras].sort((a, b) => rank(a.name) - rank(b.name));
}

export function recommendableFor(extra: Pick<Extra, "name">, business: boolean): boolean {
  return !(business && NOT_RECOMMENDED_FOR_BUSINESS.has(extra.name));
}

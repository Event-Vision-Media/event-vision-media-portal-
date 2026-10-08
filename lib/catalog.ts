// Preiskatalog für Website-Anfragen.
//
// Pakete, Extras und Preise stehen in lib/catalog-data.json – dieselbe Datei
// liest auch die Website (build.py) beim Bauen. Die Website zeigt nur
// einen Richtpreis an – verbindlich ist ausschließlich die Berechnung hier auf
// dem Server, damit Preise im Browser nicht manipuliert werden können.

import type { ProductType } from "@/lib/types";
// Einzige Quelle für Pakete, Extras und Preise (auch die Website liest diese Datei)
import catalogData from "@/lib/catalog-data.json";
import type { AccessInfo } from "@/lib/types";

export type DeviceKey = "spiegel" | "fotobox" | "360" | "audio" | "love";

export interface CatalogPackage {
  id: string;
  product: DeviceKey;
  name: string;
  price: number;
  /** Nur für Businesskunden wählbar (Firmen-Komplettpakete). */
  businessOnly?: boolean;
  /** Extras, die im Paketpreis bereits enthalten sind. */
  bundle?: string[];
}

export interface CatalogExtra {
  id: string;
  name: string;
  price: number;
  /** "ab"-Preis: Endpreis hängt vom Aufwand ab. */
  from?: boolean;
  /** Nur für Businesskunden wählbar. */
  businessOnly?: boolean;
  /** Nur für Privatkunden wählbar (Business erhält es über Corporate Branding). */
  privateOnly?: boolean;
  /** Produkte, zu denen das Extra passt. */
  for: DeviceKey[];
  /** Name des passenden Eintrags in public.extras (falls vorhanden). */
  dbExtraName?: string;
}

export const PRODUCT_LABELS: Record<DeviceKey, string> = {
  spiegel: "Fotospiegel",
  fotobox: "Fotobox",
  "360": "360° Video Booth",
  audio: "Audiogästebuch",
  love: "LOVE XXL",
};

/** Zuordnung zu bookings.product_type (bestehende Werte im Portal). */
export const PRODUCT_TYPE_BY_DEVICE: Record<DeviceKey, ProductType> = {
  spiegel: "Fotospiegel",
  fotobox: "Fotobox",
  "360": "360 Video Booth",
  audio: "Audiogästebuch",
  love: "LOVE Buchstaben",
};

export const DEVICE_BY_PRODUCT_TYPE: Record<string, DeviceKey> = {
  Fotospiegel: "spiegel",
  Fotobox: "fotobox",
  "360 Video Booth": "360",
  "Audiogästebuch": "audio",
  "LOVE Buchstaben": "love",
};

/** Hauptgeräte, die im Portal auch als "Exclusive Extra" existieren (Name in public.extras). */
export const EXTRA_NAME_BY_DEVICE: Partial<Record<DeviceKey, string>> = {
  audio: "Audiogästebuch",
  love: "XXL-LOVE Leuchtbuchstaben",
};

export const PACKAGES: CatalogPackage[] = catalogData.packages.map((p) => ({
  id: p.id,
  product: p.product as DeviceKey,
  name: p.name,
  price: p.price,
  businessOnly: "businessOnly" in p ? Boolean(p.businessOnly) : undefined,
  bundle: "bundle" in p ? (p.bundle as string[]) : undefined,
}));

/** IDs der Extras, die in den gebuchten Paketen enthalten sind (z. B. Betreuung im Firmen-Komplett). */
export function includedExtraIds(items: { packages?: { id: string }[] } | null | undefined): Set<string> {
  return new Set((items?.packages ?? []).flatMap((p) => PACKAGES.find((x) => x.id === p.id)?.bundle ?? []));
}

/**
 * Namen (public.extras) der im Paket enthaltenen Extras. Sie werden bei der
 * Buchung mit 0 € in booking_extras eingetragen – so wählt der Kunde z. B.
 * das Hintergrund-Motiv im Portal, ohne dass etwas extra berechnet wird.
 */
export function bundledExtraNames(items: { packages?: { id: string }[] } | null | undefined): string[] {
  return Array.from(includedExtraIds(items))
    .map((id) => EXTRAS.find((e) => e.id === id)?.dbExtraName)
    .filter((n): n is string => Boolean(n));
}

/** Extra-Namen, die eine Buchung bereits als Website-Paket enthält. */
export function extraNamesCoveredByPackages(items: { packages?: { product: string }[] } | null | undefined): string[] {
  return (items?.packages ?? [])
    .map((p) => EXTRA_NAME_BY_DEVICE[p.product as DeviceKey])
    .filter((n): n is string => Boolean(n));
}

/** Leistungsumfang eines Pakets – "Alles aus dem …-Paket" wird aufgelöst (für den Mietvertrag). */
export function packageFeatures(id: string): string[] {
  const p = catalogData.packages.find((x) => x.id === id);
  if (!p) return [];
  const own = p.features.filter((f) => !/^Alles aus dem /.test(f));
  const inherited = "includes" in p && p.includes ? packageFeatures(p.includes) : [];
  return [...inherited, ...own.filter((f) => !inherited.includes(f))];
}

/**
 * Was ein höheres Paket zusätzlich bietet – für Upgrade-Angebote im
 * Kundenportal (nur die Unterschiede zum nächstkleineren Paket).
 */
export const PACKAGE_UPGRADE_PERKS: Record<string, string[]> = {
  "spiegel-gold": ["Prunkvoller goldener Barock-Rahmen", "Der elegante Klassiker – unser Bestseller"],
  "spiegel-gold-firma": ["Prunkvoller goldener Barock-Rahmen", "Der elegante Klassiker – unser Bestseller"],
  "360-komfort": ["Lieferung, Auf- & Abbau durch uns", "Kurze Einweisung vor Ort"],
  "360-premium": ["Professionelles iPad mit Booth-Software", "Automatische Slow Motion & Effekte", "Sofort-Download per QR-Code"],
  "audio-komfort": ["Leuchtschild „Audio Guest Book“", "Karten mit witzigen Anweisungen", "Herz-USB-Stick mit allen Audios"],
  "audio-premium": ["Stehtisch mit Husse für stilvolle Präsentation", "Alles aus dem Komfort-Paket"],
  "love-fullservice": ["Lieferung, Aufbau & Abholung durch uns", "Kein Transport und kein Aufbau nötig"],
};

export interface UpgradeOffer {
  from: CatalogPackage;
  to: CatalogPackage;
  diff: number;
  perks: string[];
}

/** Nächsthöheres Paket je gebuchtem Paket (gleiches Produkt, höherer Preis). */
export function upgradeOffers(bookedPackageIds: string[]): UpgradeOffer[] {
  return bookedPackageIds
    .map((id) => PACKAGES.find((p) => p.id === id))
    .filter((p): p is CatalogPackage => Boolean(p))
    .map((from) => {
      const to = PACKAGES.filter((p) => p.product === from.product && p.price > from.price && Boolean(p.businessOnly) === Boolean(from.businessOnly))
        .sort((x, y) => x.price - y.price)[0];
      return to ? { from, to, diff: to.price - from.price, perks: PACKAGE_UPGRADE_PERKS[to.id] ?? [] } : null;
    })
    .filter((o): o is UpgradeOffer => Boolean(o));
}

export const EXTRAS: CatalogExtra[] = catalogData.extras.map((e) => ({
  id: e.id,
  name: e.name,
  price: e.price,
  from: e.from || undefined,
  businessOnly: "businessOnly" in e ? Boolean(e.businessOnly) : undefined,
  privateOnly: "privateOnly" in e ? Boolean(e.privateOnly) : undefined,
  for: e.for as DeviceKey[],
  dbExtraName: "dbExtraName" in e ? e.dbExtraName : undefined,
}));

/** Jeder weitere Veranstaltungstag ist so viel günstiger (nur Pakete, nur Business). */
export const FOLLOWUP_DISCOUNT: number = catalogData.followupDiscount;

/**
 * Mindestvorlauf in Tagen für eine automatische Reservierung. Kurzfristigere
 * Anfragen landen als "anfrage" beim Admin, da Layout & Planung Zeit brauchen.
 */
export const MIN_LEAD_DAYS = 7;

/** Tage zwischen heute und dem Eventdatum (YYYY-MM-DD), Zeitzone Europe/Berlin. */
export function daysUntil(eventDate: string): number {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  return Math.round((Date.parse(eventDate + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

/**
 * Beschreibt den Mehrtages-Aufschlag einer Auswahl, z. B.
 * { label: "+ 2 Folgetage (je −20 %)", amount: 718 } – oder null bei 1 Tag.
 */
export function followupLine(items: { packages?: { price: number }[]; days?: number; packagesTotal?: number } | null | undefined) {
  const days = items?.days ?? 1;
  if (!items || days <= 1) return null;
  const base = (items.packages ?? []).reduce((sum, p) => sum + p.price, 0);
  const amount = (items.packagesTotal ?? base) - base;
  const n = days - 1;
  return { label: `+ ${n} Folgetag${n > 1 ? "e" : ""} (je −${Math.round(FOLLOWUP_DISCOUNT * 100)} %)`, amount };
}
export const MAX_EVENT_DAYS = 6;

export type Handover = "lieferung" | "abholung" | "versand";

/** Wie kommt das Gerät zum Mieter? */
export function handoverFor(device: DeviceKey, packageId: string | undefined, extraIds: Set<string>): Handover {
  if (device === "audio") {
    if (extraIds.has("audio-lieferung")) return "lieferung";
    if (extraIds.has("audio-versand")) return "versand";
    return "abholung";
  }
  if (packageId === "360-self" || packageId === "love-abholung") return "abholung";
  return "lieferung";
}

/** Liefern wir mindestens ein Gerät selbst aus? (dann: Abholzeit & Fahrtkosten) */
export function hasDelivery(packages: { id: string; product: DeviceKey }[], extraIds: string[]): boolean {
  const ex = new Set(extraIds);
  return packages.some((p) => handoverFor(p.product, p.id, ex) === "lieferung");
}

export type PickupOption = { id: PickupId; label: string; short: string; price: number };
export type PickupId = "folgetag" | "abend" | "nacht" | "spaetnacht";
export const PICKUP_OPTIONS = catalogData.pickup.options as PickupOption[];

/** Fahrtkosten: bis includedKm inklusive, danach Staffel; darüber individuelles Angebot. */
export const TRAVEL = catalogData.travel as { origin: string; includedKm: number; tiers: { upToKm: number; price: number }[] };
export const TRAVEL_MAX_KM = TRAVEL.tiers[TRAVEL.tiers.length - 1].upToKm;

export interface TravelInfo {
  /** Einfache Strecke mit dem Auto ab Firmensitz (gerundet), null = nicht ermittelt. */
  km: number | null;
  /** Aufpreis in € (0 = inklusive); null = individuelles Angebot bzw. unbekannt. */
  price: number | null;
  status: "ok" | "unknown" | "over";
  /** Vom Admin manuell gesetzt. */
  manual?: boolean;
}

export function travelFor(km: number | null): TravelInfo {
  if (km == null || !Number.isFinite(km)) return { km: null, price: null, status: "unknown" };
  const rounded = Math.round(km);
  if (rounded <= TRAVEL.includedKm) return { km: rounded, price: 0, status: "ok" };
  const tier = TRAVEL.tiers.find((t) => rounded <= t.upToKm);
  return tier ? { km: rounded, price: tier.price, status: "ok" } : { km: rounded, price: null, status: "over" };
}

type Line = { id: string; name: string; price: number; from: boolean };
const LOGISTICS_IDS = ["nachtabholung", "anfahrt"];

/** Positionen für Nachtabholung und Fahrtkosten. */
export function logisticsLines(pickupId?: string | null, travel?: TravelInfo | null): Line[] {
  const out: Line[] = [];
  const pickup = PICKUP_OPTIONS.find((o) => o.id === pickupId);
  if (pickup && pickup.price > 0) out.push({ id: "nachtabholung", name: pickup.label, price: pickup.price, from: false });
  if (travel?.status === "ok" && travel.price) out.push({ id: "anfahrt", name: `Anfahrt (ca. ${travel.km} km ab Essen)`, price: travel.price, from: false });
  if (travel?.status === "over") out.push({ id: "anfahrt", name: `Anfahrt (ca. ${travel.km} km) – nach Absprache`, price: 0, from: true });
  return out;
}

/** Abholung/Fahrtkosten einer bestehenden Anfrage ändern (Admin) und Summen neu berechnen. */
export function withLogistics<T extends { extras?: Line[] | { id: string; name: string; price: number; from?: boolean }[]; packagesTotal?: number; total?: number; isFromPrice?: boolean; pickup?: string | null; travel?: TravelInfo | null }>(
  items: T,
  pickupId: string | null,
  travel: TravelInfo | null
): T {
  const extras = [...(items.extras ?? []).filter((e) => !LOGISTICS_IDS.includes(e.id)).map((e) => ({ ...e, from: Boolean(e.from) })), ...logisticsLines(pickupId, travel)];
  const total = (items.packagesTotal ?? 0) + extras.reduce((s, e) => s + e.price, 0);
  return { ...items, extras, total, isFromPrice: extras.some((e) => e.from), pickup: pickupId, travel };
}

/** Kurztexte für Admin-Ansichten. */
export function pickupSummary(id?: string | null): { text: string; night: boolean } | null {
  const o = PICKUP_OPTIONS.find((x) => x.id === id);
  return o ? { text: o.price ? `${o.label} (+${o.price} €)` : o.label, night: o.price > 0 } : null;
}
export function travelSummary(t?: TravelInfo | null): { text: string; warn: boolean } | null {
  if (!t) return null;
  const m = t.manual ? " · manuell" : "";
  if (t.status === "unknown") return { text: "Entfernung unbekannt – bitte prüfen", warn: true };
  if (t.status === "over") return { text: `ca. ${t.km} km – individuelles Angebot nötig${m}`, warn: true };
  return { text: `ca. ${t.km} km · ${t.price ? `+${t.price} €` : "inklusive"}${m}`, warn: false };
}

/** Trageservice (2. Person), wenn der Aufstellort nicht ebenerdig erreichbar ist. */
export const CARRY_SERVICE = catalogData.carryService as { name: string; stufen: number; treppe: number; for: DeviceKey[] };

/** Nur gültige Angaben übernehmen; ohne Fotospiegel/Fotobox gibt es keine Zugangsabfrage. */
export function normalizeAccess(raw: unknown, products: DeviceKey[]): AccessInfo | null {
  if (!products.some((p) => CARRY_SERVICE.for.includes(p)) || !raw || typeof raw !== "object") return null;
  const r = raw as { level?: unknown; help?: unknown };
  const level = r.level === "ebenerdig" || r.level === "stufen" || r.level === "treppe" ? r.level : null;
  if (!level) return null;
  const help = level === "ebenerdig" ? null : r.help === "service" ? "service" : "helfer";
  return { level, help };
}

export interface PricedSelection {
  packages: { id: string; product: DeviceKey; name: string; price: number }[];
  extras: { id: string; name: string; price: number; from: boolean }[];
  days: number;
  packagesTotal: number;
  total: number;
  isFromPrice: boolean;
}

/**
 * Berechnet Pakete, Extras und Gesamtpreis aus den IDs der Anfrage.
 * Unbekannte oder unpassende IDs werden ignoriert.
 */
export function priceSelection(
  packageIds: string[],
  extraIds: string[],
  days: number,
  isBusiness: boolean,
  access?: AccessInfo | null,
  logistics?: { pickup?: PickupId | null; travel?: TravelInfo | null }
): PricedSelection {
  const seenProducts = new Set<DeviceKey>();
  const packages = packageIds
    .map((id) => PACKAGES.find((p) => p.id === id))
    .filter((p): p is CatalogPackage => {
      if (!p || seenProducts.has(p.product) || (p.businessOnly && !isBusiness)) return false;
      seenProducts.add(p.product);
      return true;
    })
    .map((p) => ({ id: p.id, product: p.product, name: p.name, price: p.price }));

  // Im Paket enthaltene Extras nicht zusätzlich berechnen
  const included = includedExtraIds({ packages });
  const extras = Array.from(new Set(extraIds))
    .map((id) => EXTRAS.find((e) => e.id === id))
    .filter((e): e is CatalogExtra =>
      Boolean(e) && !included.has(e!.id) && e!.for.some((k) => seenProducts.has(k)) && (!e!.businessOnly || isBusiness) && (!e!.privateOnly || !isBusiness)
    )
    .map((e) => ({ id: e.id, name: e.name, price: e.price, from: Boolean(e.from) }));
  if (access?.help === "service" && access.level !== "ebenerdig" && CARRY_SERVICE.for.some((k) => seenProducts.has(k))) {
    extras.push({ id: "trageservice", name: CARRY_SERVICE.name, price: CARRY_SERVICE[access.level], from: false });
  }
  if (hasDelivery(packages, extraIds)) extras.push(...logisticsLines(logistics?.pickup, logistics?.travel));

  const safeDays = isBusiness ? Math.min(Math.max(1, Math.round(days) || 1), MAX_EVENT_DAYS) : 1;
  const base = packages.reduce((sum, p) => sum + p.price, 0);
  const packagesTotal = Math.round(base * (1 + (safeDays - 1) * (1 - FOLLOWUP_DISCOUNT)));
  const total = packagesTotal + extras.reduce((sum, e) => sum + e.price, 0);

  return { packages, extras, days: safeDays, packagesTotal, total, isFromPrice: extras.some((e) => e.from) };
}

/** Betreuung durch Personal: im Paket bzw. im Extra „Betreuung vor Ort“ enthaltene Stunden. */
export const STAFF_INCLUDED_HOURS = 5;
export const STAFF_MAX_EXTRA_HOURS = 6;

export interface StaffInfo {
  /** Gewünschter Beginn "HH:MM" (legt der Kunde im Portal fest). */
  start: string | null;
  /** Vereinbarte Stunden insgesamt. */
  hours: number;
  /** Vom Kunden gewünschte, noch nicht bestätigte Zusatzstunden. */
  requestedExtra: number;
}

type StaffItems = { extras?: { id: string }[]; packages?: { id: string }[]; staff?: { start?: string | null; hours?: number; requestedExtra?: number } | null };

/** Betreuung der Buchung – null, wenn keine Betreuung gebucht ist. */
export function staffFor(items: StaffItems | null | undefined): StaffInfo | null {
  const booked = (items?.extras ?? []).some((e) => e.id === "betreuung") || includedExtraIds(items).has("betreuung");
  if (!booked) return null;
  const s = items?.staff;
  return {
    start: s?.start && /^\d{2}:\d{2}$/.test(s.start) ? s.start : null,
    hours: s?.hours && s.hours >= STAFF_INCLUDED_HOURS ? s.hours : STAFF_INCLUDED_HOURS,
    requestedExtra: Math.max(0, Math.min(STAFF_MAX_EXTRA_HOURS, s?.requestedExtra ?? 0)),
  };
}

/** "19:00–24:00 Uhr (5 Std.)" bzw. "5 Std., Uhrzeit noch offen". */
export function staffLabel(st: StaffInfo): string {
  if (!st.start) return `${st.hours} Std., Uhrzeit noch offen`;
  const [h, m] = st.start.split(":").map(Number);
  const end = `${String((h + st.hours) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${st.start}–${end} Uhr (${st.hours} Std.)`;
}

/**
 * Admin bestätigt die Betreuungsdauer: Zusatzstunden werden als eigene
 * Position (je „Weitere Betreuungsstunde“) berechnet, Gesamtpreis neu.
 */
export function withStaffHours<T extends { extras?: { id: string; name: string; price: number; from?: boolean }[]; packagesTotal?: number; total?: number; isFromPrice?: boolean; staff?: StaffItems["staff"] }>(
  items: T,
  hours: number
): T {
  const extraHours = Math.max(0, hours - STAFF_INCLUDED_HOURS);
  const unit = EXTRAS.find((e) => e.id === "betreuung-stunde")?.price ?? 59;
  const extras = (items.extras ?? []).filter((e) => e.id !== "betreuung-stunde").map((e) => ({ ...e, from: Boolean(e.from) }));
  if (extraHours > 0) {
    extras.push({ id: "betreuung-stunde", name: `${extraHours} weitere Betreuungsstunde${extraHours > 1 ? "n" : ""} (je ${unit} €)`, price: extraHours * unit, from: false });
  }
  const total = (items.packagesTotal ?? 0) + extras.reduce((s, e) => s + e.price, 0);
  return { ...items, extras, total, isFromPrice: extras.some((e) => e.from), staff: { ...(items.staff ?? {}), hours, requestedExtra: 0 } };
}

export function formatEuro(value: number): string {
  return `${value.toLocaleString("de-DE")} €`;
}

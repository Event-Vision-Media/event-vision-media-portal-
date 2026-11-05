import { EXTRAS, STAFF_INCLUDED_HOURS, daysUntil, staffFor } from "@/lib/catalog";
import type { Booking } from "@/lib/types";

// Betreuung durch Personal gezielt bei der 360° Video Booth empfehlen: dort bedient jemand die
// Plattform per Fernbedienung, holt die Gäste drauf und sorgt für Sicherheit. Der Kunde fragt
// mit einem Klick an – du bestätigst, weil das Portal nicht weiß, ob an dem Tag Personal frei ist.

/** Bis so viele Tage vor dem Event kann die Betreuung im Portal angefragt werden. */
export const STAFF_UPSELL_MIN_DAYS = 3;

export interface StaffRequest {
  at: string;
  hours: number;
  start: string | null;
}

export interface StaffUpsell {
  /** 360° wird selbst abgeholt – Betreuung geht nur zusammen mit Lieferung (Komfort). */
  selfService: boolean;
  price: number;
  hourPrice: number;
  includedHours: number;
  /** Bereits angefragt (wartet auf deine Bestätigung). */
  requested: StaffRequest | null;
}

export const STAFF_360_PERKS = [
  "Wir bedienen die Plattform per Fernbedienung – ihr feiert einfach mit",
  "Wir holen die Gäste auf die Plattform und achten auf die Sicherheit",
  "Kommandos für Pose und Slow-Motion-Moment – die Videos werden spürbar besser",
  "Keine Warteschlange, Requisiten immer griffbereit",
  "Auch ihr als Gastgeber seid in den Videos mit drauf",
];

export const STAFF_360_PERKS_SIE = [
  "Wir bedienen die Plattform per Fernbedienung – Sie kümmern sich um Ihre Gäste",
  "Wir holen die Gäste auf die Plattform und achten auf die Sicherheit",
  "Kommandos für Pose und Slow-Motion-Moment – die Videos werden spürbar besser",
  "Keine Warteschlange, Requisiten immer griffbereit",
  "Auch Sie als Gastgeber sind in den Videos mit drauf",
];

type Items = Booking["inquiry_items"] & { staffRequest?: StaffRequest | null };

/** Empfehlung für die Buchung – null, wenn keine 360° gebucht ist oder schon Betreuung dabei ist. */
export function staffUpsellFor(b: Pick<Booking, "inquiry_items" | "lifecycle" | "event_date">): StaffUpsell | null {
  const items = b.inquiry_items as Items | null;
  const p360 = (items?.packages ?? []).filter((p) => p.product === "360");
  if (!p360.length || staffFor(items)) return null;
  if (!["reserviert", "bestaetigt"].includes(b.lifecycle)) return null;
  if (daysUntil(b.event_date) < STAFF_UPSELL_MIN_DAYS) return null;
  const base = EXTRAS.find((e) => e.id === "betreuung");
  const hour = EXTRAS.find((e) => e.id === "betreuung-stunde");
  return {
    selfService: p360.every((p) => p.id === "360-self"),
    price: base?.price ?? 199,
    hourPrice: hour?.price ?? 59,
    includedHours: STAFF_INCLUDED_HOURS,
    requested: items?.staffRequest ?? null,
  };
}

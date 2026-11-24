/**
 * Zeitlich begrenzte VisionBooth-Aktionen (z. B. Black Week). Gilt für alle VisionBooth-Pakete
 * inkl. Zusatz-Pakete – Fotobox/Fotospiegel sind nicht betroffen.
 * Start/Ende sind feste Zeitpunkte (deutsche Zeit) – die Aktion startet und endet von selbst.
 * Läuft im Browser und auf dem Server (kein server-only).
 */
export interface VbPromo {
  id: string;
  /** z. B. „Black Week“ */
  label: string;
  percent: number;
  /** inkl. */
  start: string;
  /** exkl. */
  end: string;
  /** für Texte wie „nur bis Montag, 30.11.“ */
  untilLabel: string;
  /** kurz für mobile Hinweise, z. B. „Mo. 30.11.“ */
  untilShort: string;
}

export const VB_PROMOS: VbPromo[] = [
  { id: "blackweek-2026", label: "Black Week", percent: 50, start: "2026-11-27T00:00:00+01:00", end: "2026-12-01T00:00:00+01:00", untilLabel: "Montag, 30.11.", untilShort: "Mo. 30.11." },
];

/** Nur zum lokalen Testen: NEXT_PUBLIC_VB_PROMO_FORCE=<id> schaltet eine Aktion dauerhaft an. */
const FORCE = process.env.NEXT_PUBLIC_VB_PROMO_FORCE;

export function activeVbPromo(at: Date = new Date()): VbPromo | null {
  if (FORCE) return VB_PROMOS.find((p) => p.id === FORCE) ?? null;
  const t = at.getTime();
  return VB_PROMOS.find((p) => t >= new Date(p.start).getTime() && t < new Date(p.end).getTime()) ?? null;
}

/**
 * Für Bestellungen/Buchungen auf dem Server: 15 Minuten Kulanz nach Aktionsende – wer die Seite
 * kurz vor Mitternacht geöffnet hat und gleich danach bucht, bekommt noch den angezeigten Preis.
 */
export function vbPromoForOrder(at: Date = new Date()): VbPromo | null {
  return activeVbPromo(at) ?? activeVbPromo(new Date(at.getTime() - 15 * 60_000));
}

/** Preis in Euro – während einer Aktion reduziert (auf Cent gerundet). */
export function vbPrice(list: number, at: Date = new Date(), promo: VbPromo | null = activeVbPromo(at)): number {
  return promo ? Math.round(list * (100 - promo.percent)) / 100 : list;
}

/** 79 → „79 €“, 39.5 → „39,50 €“ */
export function vbEuro(n: number): string {
  return Number.isInteger(n) ? `${n.toLocaleString("de-DE")} €` : `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

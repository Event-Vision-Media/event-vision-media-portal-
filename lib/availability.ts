export type AvailabilityStatus = "unbegrenzt" | "verfuegbar" | "wenige" | "ausgebucht";

export interface AvailabilityInfo {
  status: AvailabilityStatus;
  total: number | null;
  booked: number;
  blocked: number;
  remaining: number | null;
}

/**
 * Berechnet den Verfügbarkeitsstatus aus Gesamtbestand, gebuchter Menge und
 * manuell blockierter Menge. total === null bedeutet "kein Bestand
 * hinterlegt" (unbegrenzt) — es sei denn, es liegt trotzdem eine manuelle
 * Blockierung vor, dann gilt das Produkt für den Zeitraum als ausgebucht.
 */
export function computeAvailability(
  total: number | null,
  booked: number,
  blocked: number
): AvailabilityInfo {
  if (total == null) {
    if (blocked > 0) {
      return { status: "ausgebucht", total: null, booked, blocked, remaining: 0 };
    }
    return { status: "unbegrenzt", total: null, booked, blocked, remaining: null };
  }

  const remaining = Math.max(0, total - booked - blocked);
  const status: AvailabilityStatus =
    remaining <= 0 ? "ausgebucht" : remaining < total ? "wenige" : "verfuegbar";

  return { status, total, booked, blocked, remaining };
}

export function formatAvailabilityLabel(info: AvailabilityInfo): string {
  switch (info.status) {
    case "unbegrenzt":
      return "Verfügbar";
    case "verfuegbar":
      return "Verfügbar";
    case "ausgebucht":
      return "Ausgebucht";
    case "wenige":
      if (info.remaining === 1) {
        return "Nur noch 1 verfügbar";
      }
      return `Noch ${info.remaining} von ${info.total} verfügbar`;
  }
}

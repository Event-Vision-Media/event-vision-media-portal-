// Zeitfenster für Aufbau/Übergabe und Abbau/Rückgabe im Mietvertrag –
// feste Auswahl statt Freitext, damit Kalender & Abo immer exakte Zeiten haben.

export interface Slot {
  date: string; // YYYY-MM-DD
  from: string; // HH:MM
  to: string; // HH:MM, "24:00" erlaubt
}

export interface SlotPlan {
  handover: Slot;
  ret: Slot;
  /** Erlaubter Datumsbereich je Feld. */
  handoverRange: [string, string];
  retRange: [string, string];
  lastDay: string;
  /** Nachtabholung laut Anfrage gebucht (22–24 bzw. 0–3 Uhr). */
  nightBooked: "nacht" | "spaetnacht" | null;
  delivered: boolean;
}

/** 00:00 … 24:00 in 30-Minuten-Schritten. */
export const TIME_OPTIONS: string[] = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const hhmm = (t: string | null | undefined) => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);
const plus = (t: string, h: number) => `${String(Math.min(24, Number(t.slice(0, 2)) + h)).padStart(2, "0")}:${t.slice(3, 5)}`;

/** Vorgaben: Admin-Zeiten (falls schon geplant) → sonst sinnvolle Standards je Abhol-Art. */
export function planSlots(b: {
  event_date: string;
  event_days?: number | null;
  pickup?: string | null;
  delivered: boolean;
  delivery_date?: string | null;
  delivery_time?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
}): SlotPlan {
  const lastDay = shiftDate(b.event_date, Math.max(1, b.event_days ?? 1) - 1);
  const night = b.pickup === "nacht" || b.pickup === "spaetnacht" ? b.pickup : null;

  let handover: Slot, ret: Slot;
  if (b.delivered) {
    handover = { date: b.event_date, from: "12:00", to: "15:00" };
    ret =
      b.pickup === "abend" ? { date: lastDay, from: "20:00", to: "22:00" }
      : b.pickup === "nacht" ? { date: lastDay, from: "22:00", to: "24:00" }
      : b.pickup === "spaetnacht" ? { date: shiftDate(lastDay, 1), from: "00:00", to: "03:00" }
      : { date: shiftDate(lastDay, 1), from: "10:00", to: "12:00" };
  } else {
    // Selbstabholung am Standort: Vortag abholen, Folgetag zurückbringen
    handover = { date: shiftDate(b.event_date, -1), from: "17:00", to: "19:00" };
    ret = { date: shiftDate(lastDay, 1), from: "10:00", to: "12:00" };
  }
  const dt = hhmm(b.delivery_time), pt = hhmm(b.pickup_time);
  if (b.delivery_date) handover = { date: b.delivery_date, from: dt ?? handover.from, to: dt ? plus(dt, 1) : handover.to };
  if (b.pickup_date) ret = { date: b.pickup_date, from: pt ?? ret.from, to: pt ? plus(pt, 1) : ret.to };

  return {
    handover,
    ret,
    handoverRange: [shiftDate(b.event_date, -3), b.event_date],
    retRange: [lastDay, shiftDate(lastDay, 3)],
    lastDay,
    nightBooked: night,
    delivered: b.delivered,
  };
}

/** "Sa., 12.06.2027, 12:00–15:00 Uhr" – so steht es im Vertrag und wird vom Kalender gelesen. */
export function slotText(s: Slot): string {
  const d = new Date(s.date + "T12:00:00Z");
  const wd = d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "Europe/Berlin" });
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
  return `${wd}, ${date}, ${s.from}–${s.to} Uhr`;
}

/** Prüft die Auswahl; gibt eine Fehlermeldung (du/Sie) oder null zurück. */
export function validateSlots(plan: SlotPlan, h: Slot, r: Slot, sie: boolean): string | null {
  const t = (du: string, s: string) => (sie ? s : du);
  const valid = (s: Slot) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && TIME_OPTIONS.includes(s.from) && TIME_OPTIONS.includes(s.to);
  if (!valid(h) || !valid(r)) return t("Bitte wähle Datum und Uhrzeiten vollständig aus.", "Bitte wählen Sie Datum und Uhrzeiten vollständig aus.");
  if (h.to <= h.from || r.to <= r.from) return t("Bei den Zeitfenstern muss „bis“ nach „von“ liegen.", "Bei den Zeitfenstern muss „bis“ nach „von“ liegen.");
  if (h.date < plan.handoverRange[0] || h.date > plan.handoverRange[1])
    return t("Das Datum für Aufbau/Übergabe passt nicht zu deinem Eventtermin.", "Das Datum für Aufbau/Übergabe passt nicht zu Ihrem Veranstaltungstermin.");
  if (r.date < plan.retRange[0] || r.date > plan.retRange[1])
    return t("Das Datum für Abbau/Rückgabe passt nicht zu deinem Eventtermin.", "Das Datum für Abbau/Rückgabe passt nicht zu Ihrem Veranstaltungstermin.");
  if (`${r.date} ${r.from}` <= `${h.date} ${h.to}`) return t("Der Abbau muss nach dem Aufbau liegen.", "Der Abbau muss nach dem Aufbau liegen.");
  if (plan.delivered) {
    const lateSameDay = r.date === plan.lastDay && r.to > "22:00";
    const earlyNextDay = r.date === shiftDate(plan.lastDay, 1) && r.from < "06:00";
    if ((lateSameDay && !plan.nightBooked) || (earlyNextDay && plan.nightBooked !== "spaetnacht")) {
      return t(
        "Eine Abholung nach 22 Uhr ist eine Nachtabholung und kostet Aufpreis. Bitte wähle bis 22 Uhr oder den Folgetag – oder schreib uns kurz, dann buchen wir die Nachtabholung dazu.",
        "Eine Abholung nach 22 Uhr ist eine Nachtabholung und kostet Aufpreis. Bitte wählen Sie bis 22 Uhr oder den Folgetag – oder kontaktieren Sie uns, dann buchen wir die Nachtabholung dazu."
      );
    }
  }
  return null;
}

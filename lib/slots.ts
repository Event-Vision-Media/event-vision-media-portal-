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

/** Selbstabholung und Rückgabe bei uns: täglich (Mo–So) in diesem Zeitraum. */
export const SELF_PICKUP_HOURS: [string, string] = ["09:00", "19:00"];

/** Selbstabholung/Rückgabe: feste 1-Stunden-Termine (Start 09:00 … 18:00), damit du den Tag planen kannst. */
export const PICKUP_SLOT_STARTS: string[] = Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);
export const pickupSlotEnd = (from: string) => `${String(Number(from.slice(0, 2)) + 1).padStart(2, "0")}:${from.slice(3, 5)}`;

/** Überschneiden sich zwei Zeitfenster am selben Tag? */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  return a.date === b.date && a.from < b.to && b.from < a.to;
}

/** „Sa, 28.11.2026, 10:00–11:00 Uhr“ (so steht es im Vertrag) zurück in ein Zeitfenster. */
export function parseSlotText(text: string | null | undefined): Slot | null {
  const m = /(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/.exec(text ?? "");
  return m ? { date: `${m[3]}-${m[2]}-${m[1]}`, from: m[4], to: m[5] } : null;
}

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
    // Selbstabholung am Standort: Vortag abholen, Folgetag zurückbringen – jeweils ein 1-Stunden-Termin
    handover = { date: shiftDate(b.event_date, -1), from: "17:00", to: "18:00" };
    ret = { date: shiftDate(lastDay, 1), from: "10:00", to: "11:00" };
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
export function validateSlots(plan: SlotPlan, h: Slot, r: Slot, sie: boolean, busy: Slot[] = []): string | null {
  const t = (du: string, s: string) => (sie ? s : du);
  const valid = (s: Slot) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && TIME_OPTIONS.includes(s.from) && TIME_OPTIONS.includes(s.to);
  if (!valid(h) || !valid(r)) return t("Bitte wähle Datum und Uhrzeiten vollständig aus.", "Bitte wählen Sie Datum und Uhrzeiten vollständig aus.");
  if (h.to <= h.from || r.to <= r.from) return t("Bei den Zeitfenstern muss „bis“ nach „von“ liegen.", "Bei den Zeitfenstern muss „bis“ nach „von“ liegen.");
  if (h.date < plan.handoverRange[0] || h.date > plan.handoverRange[1])
    return t("Das Datum für Aufbau/Übergabe passt nicht zu deinem Eventtermin.", "Das Datum für Aufbau/Übergabe passt nicht zu Ihrem Veranstaltungstermin.");
  if (r.date < plan.retRange[0] || r.date > plan.retRange[1])
    return t("Das Datum für Abbau/Rückgabe passt nicht zu deinem Eventtermin.", "Das Datum für Abbau/Rückgabe passt nicht zu Ihrem Veranstaltungstermin.");
  if (`${r.date} ${r.from}` <= `${h.date} ${h.to}`) return t("Der Abbau muss nach dem Aufbau liegen.", "Der Abbau muss nach dem Aufbau liegen.");
  if (!plan.delivered) {
    const [open, close] = SELF_PICKUP_HOURS;
    // Von uns vorab geplante Zeiten (Admin) gelten auch außerhalb der üblichen Zeiten.
    const ok = (s: Slot, planned: Slot) => (s.from >= open && s.to <= close) || (s.date === planned.date && s.from === planned.from && s.to === planned.to);
    if (!ok(h, plan.handover) || !ok(r, plan.ret)) {
      return t(
        `Abholung und Rückgabe sind täglich zwischen ${Number(open.slice(0, 2))} und ${Number(close.slice(0, 2))} Uhr möglich. Bitte wähle ein Zeitfenster in dieser Zeit.`,
        `Abholung und Rückgabe sind täglich zwischen ${Number(open.slice(0, 2))} und ${Number(close.slice(0, 2))} Uhr möglich. Bitte wählen Sie ein Zeitfenster in dieser Zeit.`
      );
    }
    // Feste 1-Stunden-Termine (von uns vorab geplante Zeiten ausgenommen)
    const oneHour = (s: Slot, planned: Slot) => (PICKUP_SLOT_STARTS.includes(s.from) && s.to === pickupSlotEnd(s.from)) || (s.date === planned.date && s.from === planned.from && s.to === planned.to);
    if (!oneHour(h, plan.handover) || !oneHour(r, plan.ret)) {
      return t("Bitte wähle für Abholung und Rückgabe jeweils einen 1-Stunden-Termin.", "Bitte wählen Sie für Abholung und Rückgabe jeweils einen 1-Stunden-Termin.");
    }
    if (busy.some((x) => slotsOverlap(x, h)) || busy.some((x) => slotsOverlap(x, r))) {
      return t(
        "Dieser Termin ist gerade schon vergeben. Bitte wähle eine andere Uhrzeit – die Seite zeigt dir nach dem Neuladen, was noch frei ist.",
        "Dieser Termin ist gerade schon vergeben. Bitte wählen Sie eine andere Uhrzeit – nach dem Neuladen sehen Sie, was noch frei ist."
      );
    }
  }
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

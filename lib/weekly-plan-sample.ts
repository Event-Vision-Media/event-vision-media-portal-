import type { WeeklyPlan } from "@/lib/weekly-plan";

/** Beispiel-Wochenplan für die Mail-Vorschau im Admin (keine echten Daten). */
export const SAMPLE_WEEKLY_PLAN: WeeklyPlan = {
  weekStart: "2027-06-07",
  weekEnd: "2027-06-13",
  eventCount: 2,
  days: [
    { date: "2027-06-07", items: [] },
    { date: "2027-06-08", items: [] },
    { date: "2027-06-09", items: [] },
    { date: "2027-06-10", items: [] },
    {
      date: "2027-06-11",
      items: [
        { kind: "aufbau", time: "17:00–19:00 Uhr", title: "Lisa Beispiel", code: "FB-2027-0051", devices: "Audiogästebuch Komfort", place: null, address: null, phone: null, selfService: true, notes: ["💶 Bar mitnehmen: 70,00 €", "✓ alles erledigt"], warn: false },
      ],
    },
    {
      date: "2027-06-12",
      items: [
        { kind: "aufbau", time: "12:00–15:00 Uhr", title: "Anna Beispiel", code: "FB-2027-0042", devices: "Magic Mirror Gold + LOVE XXL", place: "Schloss Hugenpoet, Essen", address: "Schloss Hugenpoet, August-Thyssen-Str. 51, 45219 Essen", phone: "0171 2345678", selfService: false, notes: ["Layout wartet auf Freigabe", "💶 Bar mitnehmen: 463,00 €"], warn: true },
        { kind: "event", time: "👤 Personal 19:00–24:00 Uhr", title: "Anna Beispiel", code: "FB-2027-0042", devices: "Magic Mirror Gold + LOVE XXL", place: "Schloss Hugenpoet, Essen", address: null, phone: null, selfService: false, notes: [], warn: false },
      ],
    },
    {
      date: "2027-06-13",
      items: [
        { kind: "abbau", time: "10:00–12:00 Uhr", title: "Anna Beispiel", code: "FB-2027-0042", devices: "Magic Mirror Gold + LOVE XXL", place: "Schloss Hugenpoet, Essen", address: null, phone: null, selfService: false, notes: [], warn: false },
        { kind: "abbau", time: "10:00–12:00 Uhr", title: "Lisa Beispiel", code: "FB-2027-0051", devices: "Audiogästebuch Komfort", place: null, address: null, phone: null, selfService: true, notes: [], warn: false },
      ],
    },
  ],
  deviceAlerts: [{ date: "2027-06-12", text: "LOVE XXL: im Einsatz (einziges Gerät)" }],
  todos: [
    { code: "FB-2027-0060", title: "Muster GmbH", date: "2027-06-19", text: "Mietvertrag nicht unterschrieben" },
    { code: "FB-2027-0063", title: "Tom Beispiel", date: "2027-06-26", text: "Anfrage wartet auf deine Antwort" },
  ],
  nextWeek: [{ date: "2027-06-19", title: "Muster GmbH", devices: "Firmen-Komplett Fotospiegel Modern", place: "Messe Essen" }],
};

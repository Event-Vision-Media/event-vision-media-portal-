// Foto-Glücksrad: Gäste drehen am Rad und bekommen eine lustige Foto-Aufgabe – spontan,
// ohne Punkte und ohne Anmeldung. Die Aufgaben passen zum Anlass und sind im Kundenbereich änderbar.

import type { VbOccasionId } from "./packages";

export const WHEEL_MIN = 4;
export const WHEEL_MAX = 10;

export interface WheelConfig {
  enabled: boolean;
  items: string[];
}

const COMMON = [
  "Alle machen die verrückteste Grimasse",
  "Superhelden-Pose – mit Umhang-Gefühl!",
  "Kussmund für die Kamera",
  "Tut so, als hättet ihr gerade im Lotto gewonnen",
  "Alle schauen in eine andere Richtung",
  "Model-Blick wie auf dem Laufsteg",
  "Gruppen-Umarmung – so eng wie möglich",
  "Zeigt eure beste Tanz-Pose",
];

export const WHEEL_SETS: Record<VbOccasionId, string[]> = {
  hochzeit: [
    "Zeigt euren besten Hochzeitskuss – Luftkuss zählt auch",
    "Stellt den Heiratsantrag nach",
    "Alle machen ein Herz mit den Händen",
    "Tut so, als wärt ihr die Trauzeugen bei der Rede",
    "Verrückteste Grimasse für das Brautpaar",
    "Model-Blick wie auf dem Laufsteg",
    "Gruppen-Umarmung – so eng wie möglich",
    "Zeigt eure beste Tanz-Pose für den Eröffnungstanz",
  ],
  geburtstag: [
    "Tut so, als würdet ihr die Kerzen auspusten",
    "Alle zeigen mit den Fingern das Alter des Geburtstagskindes",
    "Superhelden-Pose – mit Umhang-Gefühl!",
    "Verrückteste Grimasse",
    "Tut so, als hättet ihr gerade im Lotto gewonnen",
    "Model-Blick wie auf dem Laufsteg",
    "Gruppen-Umarmung – so eng wie möglich",
    "Zeigt eure beste Tanz-Pose",
  ],
  kindergeburtstag: [
    "Brüllt wie ein Löwe",
    "Superhelden-Pose!",
    "Streckt die Zunge raus",
    "Macht Hasenohren",
    "Alle springen gleichzeitig",
    "Zeigt eure stärksten Muskeln",
    "Macht ein überraschtes Gesicht",
    "Tut so, als wärt ihr Roboter",
  ],
  babyparty: [
    "Tut so, als würdet ihr ein Baby wiegen",
    "Zeigt euer bestes Baby-Gesicht",
    "Alle machen ein Herz mit den Händen",
    "Tippt mit den Fingern: Junge oder Mädchen?",
    "Überraschtes Gesicht – „Es wird …!“",
    "Gruppen-Umarmung – so eng wie möglich",
    "Verrückteste Grimasse",
    "Model-Blick wie auf dem Laufsteg",
  ],
  party: COMMON,
  firma: [
    "Team-Pose wie auf dem Firmenplakat",
    "Superhelden-Pose – ihr rettet das Projekt",
    "Alle zeigen Daumen hoch",
    "Tut so, als hättet ihr gerade den großen Auftrag gewonnen",
    "Model-Blick wie auf dem Laufsteg",
    "Gruppen-Umarmung – so eng wie möglich",
    "Verrückteste Grimasse",
    "Zeigt eure beste Tanz-Pose",
  ],
  weihnachtsfeier: [
    "Tut so, als würdet ihr Geschenke auspacken",
    "Alle machen den Weihnachtsmann – Ho ho ho!",
    "Superhelden-Pose – ihr rettet Weihnachten",
    "Verrückteste Grimasse",
    "Tut so, als wäre es eiskalt",
    "Gruppen-Umarmung – so eng wie möglich",
    "Model-Blick wie auf dem Laufsteg",
    "Zeigt eure beste Tanz-Pose",
  ],
  messe: COMMON,
  sonstiges: COMMON,
};

export function wheelDefaultFor(occasion: string | null | undefined): string[] {
  return WHEEL_SETS[(occasion as VbOccasionId) ?? "sonstiges"] ?? COMMON;
}

export function parseWheel(raw: unknown): WheelConfig {
  const r = (raw ?? {}) as { enabled?: unknown; items?: unknown };
  const items = Array.isArray(r.items) ? r.items.map((x) => String(x).trim().slice(0, 90)).filter(Boolean).slice(0, WHEEL_MAX) : [];
  return { enabled: r.enabled === true && items.length >= WHEEL_MIN, items };
}

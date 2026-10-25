// Schritte des Besucher-Trichters der Website – in dieser Reihenfolge ausgewertet.
export const FUNNEL_STEPS = [
  "einstieg",
  "termin_check",
  "formular",
  "schritt_2",
  "schritt_3",
  "schritt_4",
  "schritt_5",
  "absenden",
  "abgeschickt",
  "whatsapp",
  "telefon",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  einstieg: "Auf die Website gekommen",
  termin_check: "„Termin prüfen“ benutzt",
  formular: "Anfrageformular geöffnet",
  schritt_2: "Schritt 2 · Anlass",
  schritt_3: "Schritt 3 · Produkte & Preise",
  schritt_4: "Schritt 4 · Datum & Ort",
  schritt_5: "Schritt 5 · Kontaktdaten",
  absenden: "„Anfrage absenden“ geklickt",
  abgeschickt: "Anfrage angekommen",
  whatsapp: "WhatsApp geklickt",
  telefon: "Telefon geklickt",
};

// Anonymer Besucher-Trichter für visionbooth.de und den VisionBooth-Upsell im Kundenportal.
// Gespeichert in funnel_events (Schritt mit Präfix „vb_“, Quelle im Feld campaign) – ohne Cookies, ohne IP, ohne Kennung.

export const VB_FUNNEL_STEPS = ["vb_besuch", "vb_demo", "vb_buchen", "vb_paket", "vb_details", "vb_uebersicht", "vb_bezahlen", "vb_upsell_gesehen"] as const;
export type VbFunnelStep = (typeof VB_FUNNEL_STEPS)[number];

export const VB_FUNNEL_LABELS: Record<VbFunnelStep, string> = {
  vb_besuch: "Auf visionbooth.de gekommen",
  vb_demo: "Live-Demo geöffnet",
  vb_buchen: "Buchung gestartet (Anlass)",
  vb_paket: "Paket ausgewählt",
  vb_details: "Details eingeben",
  vb_uebersicht: "Übersicht erreicht",
  vb_bezahlen: "„Bezahlen“ geklickt",
  vb_upsell_gesehen: "Upsell-Karte im Kundenportal gesehen",
};

/** Hauptpfad (ohne Demo und Upsell) – in dieser Reihenfolge ausgewertet */
export const VB_FUNNEL_MAIN: VbFunnelStep[] = ["vb_besuch", "vb_buchen", "vb_paket", "vb_details", "vb_uebersicht", "vb_bezahlen"];

export const VB_SOURCES = ["website", "galerie", "suche", "ads", "social", "direkt", "andere"] as const;
export type VbSource = (typeof VB_SOURCES)[number];
export const VB_SOURCE_LABELS: Record<VbSource, string> = {
  website: "über fotobox-essen.com",
  galerie: "über eine Online-Galerie (Gäste)",
  suche: "Google & andere Suche",
  ads: "Werbeanzeige",
  social: "Instagram, Facebook & Co.",
  direkt: "direkt (Link, QR-Code, eingetippt)",
  andere: "andere Seiten",
};

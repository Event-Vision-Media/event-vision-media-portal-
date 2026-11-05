// VisionBooth-Pakete und Anlässe: daraus wird ein Event bei Buchung automatisch passend eingerichtet.
// Paket = Umfang (KI-Kontingent, Laufzeit, Business-Funktionen), Anlass = Design und Missionen.
// Der Kunde kann Design und Missionen danach im Kundenbereich anpassen.

export type VbPlanId = "party" | "hochzeit" | "business" | "messe" | "addon-privat" | "addon-firma";
export type VbOccasionId = "hochzeit" | "geburtstag" | "kindergeburtstag" | "babyparty" | "party" | "firma" | "weihnachtsfeier" | "messe" | "sonstiges";

/**
 * Umsatzsteuer: „kleinunternehmer“ (§ 19 UStG, keine MwSt.) oder „regel“ (Preise inkl. 19 % MwSt.).
 * Beim Wechsel zur Regelbesteuerung nur diesen Wert ändern – die Preise bleiben Endpreise.
 */
export const VB_TAX = "kleinunternehmer" as "kleinunternehmer" | "regel";
export const vbTaxNote = () => (VB_TAX === "regel" ? "Alle Preise inkl. 19 % MwSt." : "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");

/** Spiele, die bei der Buchung gewählt und später im Kundenbereich geändert werden können. */
export interface VbGames {
  missions: boolean;
  reveal: boolean;
  leads: boolean;
  /** Foto-Glücksrad (ältere Buchungen ohne Feld = aus) */
  wheel?: boolean;
}

export interface VbPlan {
  id: VbPlanId;
  label: string;
  /** Preisvorschlag in Euro (Anzeige; maßgeblich ist die Buchung) */
  price: number;
  /** Spalte vb_events.package (Abrechnungsart) */
  kind: "privat" | "business" | "addon";
  firma: boolean;
  aiLimit: number;
  aiPerGuest: number;
  /** Gäste-Link aktiv ab Event-Tag für so viele Tage */
  days: number;
  retentionDays: number;
  summary: string;
}

export const VB_PLANS: VbPlan[] = [
  { id: "party", label: "Classic", price: 79, kind: "privat", firma: false, aiLimit: 0, aiPerGuest: 0, days: 7, retentionDays: 90, summary: "Rahmen, Fotostreifen, Galerie, Foto-Wand, Spiele" },
  { id: "hochzeit", label: "Premium mit KI", price: 129, kind: "privat", firma: false, aiLimit: 150, aiPerGuest: 3, days: 14, retentionDays: 180, summary: "wie Classic + 150 KI-Bilder, 6 Monate Galerie" },
  { id: "business", label: "Business", price: 299, kind: "business", firma: true, aiLimit: 300, aiPerGuest: 3, days: 7, retentionDays: 90, summary: "Firmen-Design mit Logo, 300 KI-Bilder, Missionen für Teams" },
  { id: "messe", label: "Messe", price: 699, kind: "business", firma: true, aiLimit: 1000, aiPerGuest: 2, days: 5, retentionDays: 60, summary: "mehrtägig, 1.000 KI-Bilder, Marken-Rahmen" },
  { id: "addon-privat", label: "Add-on Fotobox (privat)", price: 49, kind: "addon", firma: false, aiLimit: 100, aiPerGuest: 3, days: 14, retentionDays: 90, summary: "zusätzlich zur Fotobox/Spiegel, 100 KI-Bilder" },
  { id: "addon-firma", label: "Add-on Fotobox (Firma)", price: 149, kind: "addon", firma: true, aiLimit: 200, aiPerGuest: 3, days: 7, retentionDays: 90, summary: "zusätzlich zur Fotobox/Spiegel, 200 KI-Bilder, Logo" },
];

export interface VbOccasion {
  id: VbOccasionId;
  label: string;
  template: string;
  /** Missions-Vorlage aus challenges.ts (leer = keine Missionen) */
  challenges: string | null;
  aiStyles: string[];
  /** Gender-Reveal-Tippspiel vorausgewählt */
  reveal?: boolean;
  /** KI-Verwandlung aus (Kinderfotos nicht an KI-Dienste – Datenschutz) */
  noAi?: boolean;
}

export const VB_OCCASIONS: VbOccasion[] = [
  { id: "hochzeit", label: "Hochzeit", template: "elegant-gold", challenges: "hochzeit", aiStyles: ["glamour", "vintage", "animation", "superheld"] },
  { id: "kindergeburtstag", label: "Kindergeburtstag", template: "dino-dschungel", challenges: "kinder", aiStyles: [], noAi: true },
  { id: "babyparty", label: "Babyparty / Gender Reveal", template: "minimal-weiss", challenges: "babyparty", aiStyles: ["glamour", "animation", "vintage", "superheld"], reveal: true },
  { id: "geburtstag", label: "Geburtstag", template: "gold-ballons", challenges: "geburtstag", aiStyles: ["superheld", "comic", "animation", "glamour"] },
  { id: "party", label: "Party / Abiball", template: "neon-geburtstag", challenges: "party", aiStyles: ["neon", "comic", "superheld", "animation"] },
  { id: "firma", label: "Firmenfeier", template: "corporate", challenges: "firma", aiStyles: ["business", "superheld", "comic", "glamour"] },
  { id: "weihnachtsfeier", label: "Weihnachtsfeier", template: "winterzauber", challenges: "firma", aiStyles: ["weihnachten", "superheld", "comic", "business"] },
  { id: "messe", label: "Messe / Promotion", template: "corporate", challenges: null, aiStyles: ["business", "superheld", "comic", "neon"] },
  { id: "sonstiges", label: "Sonstiges", template: "polaroid", challenges: "party", aiStyles: ["glamour", "superheld", "comic", "animation"] },
];

export const getPlan = (id: string | null | undefined) => VB_PLANS.find((p) => p.id === id) ?? VB_PLANS[0];
export const getOccasion = (id: string | null | undefined) => VB_OCCASIONS.find((o) => o.id === id) ?? VB_OCCASIONS[VB_OCCASIONS.length - 1];

/** Vorauswahl der Spiele je Paket und Anlass. */
export function defaultGames(plan: VbPlanId, occasion: VbOccasionId): VbGames {
  const o = getOccasion(occasion);
  return { missions: Boolean(o.challenges), reveal: Boolean(o.reveal), leads: plan === "business" || plan === "messe", wheel: ["hochzeit", "geburtstag", "kindergeburtstag", "party"].includes(occasion) };
}

/**
 * Welche Spiele zum Anlass passen (Kundenbereich zeigt diese oben, den Rest eingeklappt).
 * Ohne Anlass (ältere Events) passt alles.
 */
export function relevantGames(occasion: string | null | undefined, plan: string | null | undefined): VbGames {
  if (!occasion || !VB_OCCASIONS.some((o) => o.id === occasion)) return { missions: true, reveal: true, leads: true, wheel: true };
  const firmaAnlass = occasion === "firma" || occasion === "weihnachtsfeier" || occasion === "messe";
  return {
    missions: occasion !== "messe",
    reveal: occasion === "babyparty",
    leads: firmaAnlass || (Boolean(plan) && getPlan(plan).firma),
    wheel: occasion !== "messe",
  };
}

/** Freitext-Anlass aus Buchung/Anfrage („Hochzeit am See“, „Firmenjubiläum“ …) einem Anlass zuordnen. */
export function guessOccasion(text: string | null | undefined, firma = false): VbOccasionId {
  const t = (text ?? "").toLowerCase();
  if (/hochzeit|trauung|polterabend|verlobung/.test(t)) return "hochzeit";
  if (/gender|baby|reveal/.test(t)) return "babyparty";
  if (/kinder|kids|kita|\b[1-9]\.?\s*geburtstag/.test(t)) return "kindergeburtstag";
  if (/weihnacht|xmas|advent|jahresabschluss/.test(t)) return "weihnachtsfeier";
  if (/messe|promo|ausstellung|kongress|roadshow/.test(t)) return "messe";
  if (/geburtstag|jubiläum.*jahre|\b\d{2}\.?\s*(geb|bday)|birthday|ü\d0/.test(t)) return "geburtstag";
  if (/firm|betrieb|sommerfest|team|mitarbeiter|jubiläum|gala|kunden/.test(t)) return "firma";
  if (/party|abi|feier|fest|club/.test(t)) return firma ? "firma" : "party";
  return firma ? "firma" : "sonstiges";
}

/** Passendes Paket, wenn VisionBooth als Zusatz zu einer Fotobox-Buchung angelegt wird. */
export const addonPlanFor = (firma: boolean): VbPlanId => (firma ? "addon-firma" : "addon-privat");

// Kontaktformular für Firmen-Events (Gewinnspiel / Newsletter / Rückruf) – immer freiwillig,
// das Foto gibt es auch ohne Teilnahme (DSGVO: keine Kopplung von Download und Einwilligung).

export type LeadField = "name" | "email" | "company" | "phone";

export interface LeadConfig {
  enabled: boolean;
  title: string;
  text: string;
  fields: LeadField[];
  /** Wer die Daten bekommt und wofür – erscheint im Einwilligungstext */
  sponsor: string;
  purpose: string;
}

export const LEAD_FIELDS: { id: LeadField; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "E-Mail" },
  { id: "company", label: "Firma" },
  { id: "phone", label: "Telefon" },
];

export const LEAD_DEFAULT: LeadConfig = {
  enabled: false,
  title: "Gewinnspiel: Mitmachen & gewinnen!",
  text: "Trag dich ein und sichere dir die Chance auf einen tollen Preis.",
  fields: ["name", "email"],
  sponsor: "",
  purpose: "zur Durchführung des Gewinnspiels und um mich über Angebote zu informieren",
};

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export function parseLeadConfig(raw: unknown): LeadConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<LeadConfig>;
  const fields = Array.isArray(r.fields) ? r.fields.filter((f): f is LeadField => LEAD_FIELDS.some((x) => x.id === f)) : LEAD_DEFAULT.fields;
  return {
    enabled: r.enabled === true,
    title: clip(r.title, 70) || LEAD_DEFAULT.title,
    text: clip(r.text, 200),
    // E-Mail ist immer dabei – sonst ist der Kontakt wertlos
    fields: fields.includes("email") ? fields : ["email", ...fields],
    sponsor: clip(r.sponsor, 80),
    purpose: clip(r.purpose, 160) || LEAD_DEFAULT.purpose,
  };
}

/** Einwilligungstext, wie ihn der Gast sieht – wird beim Eintrag mitgespeichert. */
export const leadConsentText = (c: LeadConfig, fallbackSponsor: string) =>
  `Ich bin einverstanden, dass ${c.sponsor || fallbackSponsor} meine Angaben ${c.purpose} verwendet. Die Einwilligung kann ich jederzeit widerrufen.`;

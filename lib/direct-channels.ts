// Herkunft von Buchungen, die im Admin selbst angelegt werden (Statistik „Direkt angelegt“).
// Website-Anfragen erkennen ihre Herkunft automatisch und brauchen das nicht.

export const DIRECT_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telefon", label: "Telefon" },
  { id: "empfehlung", label: "Empfehlung" },
  { id: "social", label: "Instagram / Facebook" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;

export type DirectChannel = (typeof DIRECT_CHANNELS)[number]["id"];

export const directChannelLabel = (id: string | null | undefined) => DIRECT_CHANNELS.find((c) => c.id === id)?.label ?? "ohne Angabe";

/** Im Admin angelegt (nicht über das Website-Formular)? */
export const isDirectBooking = (source: { source?: string } | null | undefined) => source?.source === "Admin";

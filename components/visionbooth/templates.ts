import type { VbOccasionId } from "./packages";
// Design-Vorlagen für VisionBooth. Eine Vorlage legt Farben, Schriften, Fotorahmen und
// Verzierung fest – der Kunde ändert nur Titel, Unterzeile, Akzentfarbe und Logo.
// Gilt für Einzelfoto, Fotostreifen und Story (siehe frame.ts).

export type FontRole = "display" | "ui" | "script" | "hand";
export type PhotoStyle = "double" | "thin" | "arch" | "neon" | "rounded" | "polaroid" | "bleed" | "corporate";
export type Decor = "none" | "confetti" | "snow" | "hearts" | "sparkle" | "sticker";

export interface ArtBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Gestaltetes Hintergrundbild einer Vorlage: Hintergrund, Ebene über den Fotos (z. B. Ballons), Fotofelder, Textfläche. */
export interface ArtLayer {
  bg: string;
  overlay: string;
  slots: ArtBox[];
  text: ArtBox;
  /** Grundlinie des kleinen „VisionBooth“-Hinweises, falls er nicht unten in der Textfläche stehen soll (z. B. bei Bannern) */
  creditY?: number;
  /** Unterzeile (Datum) weglassen, wenn sie auf einer Verzierung landen würde */
  hideSub?: boolean;
}

export interface VbTemplate {
  id: string;
  name: string;
  /** Wofür die Vorlage gedacht ist (Anzeige im Admin) */
  occasions: string;
  /** Vorgeschlagene Akzentfarbe beim Wechsel auf diese Vorlage */
  accent: string;
  bg: string;
  /** Titelfarbe – "accent" = Akzentfarbe des Events */
  ink: string;
  sub: string;
  titleFont: FontRole;
  titleWeight: number;
  titleUpper?: boolean;
  titleItalic?: boolean;
  /** Startgröße des Titels (wird bei langem Text verkleinert) */
  titleSize: number;
  subFont: FontRole;
  subUpper?: boolean;
  photo: PhotoStyle;
  decor: Decor;
  /** Motiv-Sticker auf den Foto-Ecken (Kinder-Mottos), Reihenfolge: oben links, oben rechts, unten rechts, unten links */
  stickers?: [string, string, string, string];
  /** Hintergrundmuster: Punkte oder Sterne */
  pattern?: "dots" | "stars";
  /** Vorlagengruppe in der Auswahl */
  group?: "kinder";
  /** Gestaltete Bild-Vorlage statt gezeichnetem Rahmen (Fotostreifen optional, sonst schlichter Ersatz) */
  art?: { single: ArtLayer; strip?: ArtLayer; stripFallback?: string };
}

const ART = "/visionbooth/rahmen";
function artLayer(id: string, kind: "single" | "strip", slots: ArtBox[], text: ArtBox): ArtLayer {
  return { bg: `${ART}/${id}-${kind}-bg.jpg`, overlay: `${ART}/${id}-${kind}-ov.png`, slots, text };
}

/** Gestaltetes Einzelfoto-Design; Text in Akzentfarbe (vom Kunden änderbar). */
function artSingle(
  id: string,
  name: string,
  occasions: string,
  look: { accent: string; bg: string; sub: string; font: FontRole; weight?: number; size: number; upper?: boolean; neon?: boolean; kinder?: boolean; fallback: string; creditY?: number; hideSub?: boolean },
  slot: ArtBox,
  text: ArtBox,
): VbTemplate {
  return {
    id,
    name,
    occasions,
    accent: look.accent,
    bg: look.bg,
    ink: "accent",
    sub: look.sub,
    titleFont: look.font,
    titleWeight: look.weight ?? 400,
    titleUpper: look.upper,
    titleSize: look.size,
    subFont: "ui",
    subUpper: true,
    photo: look.neon ? "neon" : "thin",
    decor: "none",
    group: look.kinder ? "kinder" : undefined,
    art: { single: { ...artLayer(id, "single", [slot], text), creditY: look.creditY, hideSub: look.hideSub }, stripFallback: look.fallback },
  };
}

export const VB_TEMPLATES: VbTemplate[] = [
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    occasions: "Hochzeit · Firma · Gala",
    accent: "#c4933f",
    bg: "#0d0d0f",
    ink: "accent",
    sub: "rgba(255,255,255,0.62)",
    titleFont: "display",
    titleWeight: 600,
    titleSize: 70,
    subFont: "ui",
    subUpper: true,
    photo: "double",
    decor: "none",
  },
  {
    id: "minimal-weiss",
    name: "Minimal Weiß",
    occasions: "Alle Anlässe",
    accent: "#1f2227",
    bg: "#ffffff",
    ink: "#1f2227",
    sub: "rgba(31,34,39,0.55)",
    titleFont: "ui",
    titleWeight: 700,
    titleUpper: true,
    titleSize: 54,
    subFont: "ui",
    subUpper: true,
    photo: "thin",
    decor: "none",
  },
  {
    id: "romantik",
    name: "Romantik",
    occasions: "Hochzeit · Verlobung",
    accent: "#b76e79",
    bg: "#f7f1e8",
    ink: "accent",
    sub: "rgba(80,58,52,0.7)",
    titleFont: "script",
    titleWeight: 400,
    titleSize: 96,
    subFont: "display",
    subUpper: true,
    photo: "rounded",
    decor: "hearts",
  },
  {
    id: "boho",
    name: "Boho",
    occasions: "Hochzeit · Geburtstag",
    accent: "#c0714f",
    bg: "#efe5d8",
    ink: "#5b4636",
    sub: "rgba(91,70,54,0.7)",
    titleFont: "display",
    titleWeight: 500,
    titleItalic: true,
    titleSize: 72,
    subFont: "ui",
    subUpper: true,
    photo: "arch",
    decor: "sparkle",
  },
  {
    id: "party-konfetti",
    name: "Party Konfetti",
    occasions: "Geburtstag · Party",
    accent: "#ff4f8b",
    bg: "#ffffff",
    ink: "#16181c",
    sub: "accent",
    titleFont: "ui",
    titleWeight: 800,
    titleSize: 66,
    subFont: "ui",
    subUpper: true,
    photo: "rounded",
    decor: "confetti",
  },
  {
    id: "neon",
    name: "Neon Night",
    occasions: "Party · Abiball · Club",
    accent: "#ff3ea5",
    bg: "#08070d",
    ink: "#ffffff",
    sub: "accent",
    titleFont: "ui",
    titleWeight: 800,
    titleUpper: true,
    titleSize: 60,
    subFont: "ui",
    subUpper: true,
    photo: "neon",
    decor: "none",
  },
  {
    id: "corporate",
    name: "Corporate",
    occasions: "Firmenevent · Messe",
    accent: "#2f6fb5",
    bg: "#ffffff",
    ink: "#16181c",
    sub: "rgba(22,24,28,0.55)",
    titleFont: "ui",
    titleWeight: 700,
    titleSize: 54,
    subFont: "ui",
    photo: "corporate",
    decor: "none",
  },
  {
    id: "winterzauber",
    name: "Winterzauber",
    occasions: "Weihnachtsfeier · Winter",
    accent: "#d4a95c",
    bg: "#0f2a1d",
    ink: "accent",
    sub: "rgba(255,255,255,0.7)",
    titleFont: "display",
    titleWeight: 600,
    titleSize: 70,
    subFont: "ui",
    subUpper: true,
    photo: "double",
    decor: "snow",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    occasions: "Alle Anlässe · Retro",
    accent: "#1f2227",
    bg: "#fbfaf6",
    ink: "#2b2b2b",
    sub: "rgba(43,43,43,0.6)",
    titleFont: "hand",
    titleWeight: 600,
    titleSize: 80,
    subFont: "hand",
    photo: "polaroid",
    decor: "none",
  },
  {
    id: "vollbild",
    name: "Vollbild",
    occasions: "Alle Anlässe",
    accent: "#ffffff",
    bg: "#000000",
    ink: "#ffffff",
    sub: "rgba(255,255,255,0.8)",
    titleFont: "display",
    titleWeight: 600,
    titleSize: 64,
    subFont: "ui",
    subUpper: true,
    photo: "bleed",
    decor: "none",
  },
  // ---------- Gestaltete Bild-Vorlagen ----------
  {
    id: "gold-ballons",
    name: "Gold & Ballons",
    occasions: "Geburtstag · Party · Jubiläum",
    accent: "#d6a849",
    bg: "#0b0a0c",
    ink: "accent",
    sub: "rgba(255,255,255,0.7)",
    titleFont: "script",
    titleWeight: 400,
    titleSize: 120,
    subFont: "ui",
    subUpper: true,
    photo: "thin",
    decor: "none",
    art: {
      single: artLayer("gold-ballons", "single", [{ x: 91, y: 86, w: 900, h: 997 }], { x: 110, y: 1090, w: 860, h: 200 }),
      strip: artLayer("gold-ballons", "strip", [{ x: 81, y: 72, w: 918, h: 605 }, { x: 81, y: 711, w: 918, h: 605 }, { x: 81, y: 1350, w: 918, h: 606 }], { x: 110, y: 1990, w: 860, h: 330 }),
    },
  },
  {
    id: "neon-party",
    name: "Neon Party",
    occasions: "Geburtstag · Party · Abiball",
    accent: "#ff4fc3",
    bg: "#0c0f22",
    ink: "accent",
    sub: "rgba(160,240,255,0.85)",
    titleFont: "script",
    titleWeight: 400,
    titleSize: 120,
    subFont: "ui",
    subUpper: true,
    photo: "neon",
    decor: "none",
    art: {
      single: artLayer("neon-party", "single", [{ x: 190, y: 194, w: 700, h: 726 }], { x: 110, y: 1010, w: 600, h: 290 }),
      strip: artLayer("neon-party", "strip", [{ x: 150, y: 220, w: 780, h: 491 }, { x: 150, y: 821, w: 780, h: 490 }, { x: 150, y: 1429, w: 781, h: 490 }], { x: 110, y: 1980, w: 760, h: 330 }),
    },
  },
  artSingle("schwarz-gold", "Schwarz-Gold Gala", "Geburtstag · Jubiläum · Silvester", { accent: "#e2b75a", bg: "#0a0908", sub: "rgba(255,255,255,0.7)", font: "script", size: 110, fallback: "elegant-gold" }, { x: 82, y: 85, w: 916, h: 921 }, { x: 255, y: 1020, w: 600, h: 230 }),
  artSingle("champagner", "Champagner & Rosé", "Geburtstag · Hochzeit · Jubiläum", { accent: "#9a6a35", bg: "#f6ebe0", sub: "rgba(90,60,35,0.7)", font: "script", size: 110, fallback: "romantik" }, { x: 89, y: 90, w: 889, h: 921 }, { x: 150, y: 1025, w: 780, h: 230 }),
  artSingle("bunt-ballons", "Bunte Ballons", "Geburtstag · Party", { accent: "#d81b72", bg: "#ffffff", sub: "rgba(40,40,60,0.65)", font: "script", size: 110, fallback: "party-konfetti" }, { x: 109, y: 163, w: 858, h: 875 }, { x: 160, y: 1050, w: 760, h: 230 }),
  artSingle("neon-geburtstag", "Neon Geburtstag", "Geburtstag · Party", { accent: "#ff4fc3", bg: "#120c2a", sub: "rgba(160,240,255,0.85)", font: "script", size: 92, neon: true, fallback: "neon" }, { x: 131, y: 167, w: 819, h: 797 }, { x: 210, y: 1022, w: 660, h: 190 }),
  artSingle("kreide", "Kreidetafel", "Geburtstag · Party · Kindergeburtstag", { accent: "#ffffff", bg: "#1c1c1c", sub: "rgba(255,255,255,0.75)", font: "hand", weight: 600, size: 72, fallback: "elegant-gold", creditY: 1346 }, { x: 108, y: 149, w: 862, h: 866 }, { x: 250, y: 1112, w: 580, h: 130 }),
  artSingle("botanisch", "Botanisch", "Hochzeit · Verlobung · Taufe", { accent: "#4b5b4f", bg: "#ffffff", sub: "rgba(75,91,79,0.7)", font: "script", size: 100, fallback: "minimal-weiss", creditY: 1336 }, { x: 70, y: 88, w: 940, h: 861 }, { x: 315, y: 1050, w: 450, h: 170 }),
  artSingle("eukalyptus", "Eukalyptus", "Hochzeit · Verlobung · Taufe", { accent: "#5d6b5a", bg: "#fbfaf6", sub: "rgba(93,107,90,0.7)", font: "script", size: 100, fallback: "minimal-weiss" }, { x: 187, y: 98, w: 704, h: 929 }, { x: 270, y: 1095, w: 520, h: 200 }),
  artSingle("dino-dschungel", "Dino-Dschungel", "Kindergeburtstag", { accent: "#5a3a17", bg: "#2f4a1e", sub: "rgba(90,58,23,0.75)", font: "hand", weight: 700, size: 70, kinder: true, fallback: "dino", creditY: 1336 }, { x: 138, y: 145, w: 781, h: 838 }, { x: 240, y: 1035, w: 600, h: 150 }),
  artSingle("feuerwehr-comic", "Feuerwehr-Comic", "Kindergeburtstag", { accent: "#c8102e", bg: "#1d4fd6", sub: "rgba(120,20,20,0.8)", font: "ui", weight: 800, size: 72, upper: true, kinder: true, fallback: "feuerwehr", creditY: 1336 }, { x: 124, y: 52, w: 820, h: 1015 }, { x: 220, y: 1110, w: 640, h: 160 }),
  artSingle("prinzessin-schloss", "Prinzessin & Einhorn", "Kindergeburtstag", { accent: "#a3155f", bg: "#f6c6e0", sub: "rgba(120,20,70,0.8)", font: "script", size: 90, kinder: true, fallback: "prinzessin", creditY: 1336, hideSub: true }, { x: 172, y: 100, w: 735, h: 925 }, { x: 230, y: 1118, w: 620, h: 130 }),
  // ---------- Kindergeburtstag (Mottos) ----------
  kid("prinzessin", "Prinzessin", "#e0559a", "#fff0f6", "accent", "#b0487e", "script", 400, ["👑", "✨", "💖", "🦄"], "dots"),
  kid("einhorn", "Einhorn & Regenbogen", "#a66cff", "#f6f0ff", "accent", "#7b55c7", "hand", 600, ["🦄", "🌈", "⭐", "🍭"], "stars"),
  kid("dino", "Dino-Abenteuer", "#3f9a3a", "#eaf6dd", "#24461f", "#3f7a3a", "hand", 600, ["🦖", "🌿", "🦕", "🌋"], "dots"),
  kid("feuerwehr", "Feuerwehr", "#e3342f", "#fff5ec", "#c21d1d", "#7a4a2a", "ui", 800, ["🚒", "🔥", "👨‍🚒", "🧯"], "dots", true),
  kid("pirat", "Piraten", "#8b5a2b", "#f3e8d2", "#3b2a1a", "#6b4a2b", "display", 700, ["🏴‍☠️", "🦜", "💰", "⚓"], "dots"),
  kid("weltraum", "Weltraum", "#7c8cff", "#0b1030", "#ffffff", "rgba(255,255,255,0.75)", "ui", 800, ["🚀", "🪐", "👽", "⭐"], "stars", true),
  kid("fussball", "Fußball", "#16a34a", "#e8f7ee", "#14532d", "#2f6b45", "ui", 800, ["⚽", "🏆", "🥅", "⭐"], "dots", true),
];

/** Kinder-Motto: heller Hintergrund, runder Fotorahmen, Sticker auf den Ecken. */
function kid(id: string, name: string, accent: string, bg: string, ink: string, sub: string, titleFont: FontRole, titleWeight: number, stickers: [string, string, string, string], pattern: "dots" | "stars", titleUpper = false): VbTemplate {
  return { id, name, occasions: "Kindergeburtstag", accent, bg, ink, sub, titleFont, titleWeight, titleUpper, titleSize: titleFont === "script" ? 84 : 66, subFont: "ui", subUpper: true, photo: "rounded", decor: "sticker", stickers, pattern, group: "kinder" };
}

export const DEFAULT_TEMPLATE = "elegant-gold";

/** Alte Rahmen-Stile (vor den Vorlagen) auf Vorlagen abbilden. */
const LEGACY: Record<string, string> = { gold: "elegant-gold", weiss: "minimal-weiss", schwarz: "elegant-gold", ohne: "vollbild" };

export function getTemplate(id: string | null | undefined): VbTemplate {
  const key = id && (VB_TEMPLATES.some((t) => t.id === id) ? id : LEGACY[id]);
  return VB_TEMPLATES.find((t) => t.id === key) ?? VB_TEMPLATES[0];
}

/** Passende Designs je Anlass für die Auswahl bei der Buchung (Standard-Design des Anlasses kommt zuerst). */
const FOR_OCCASION: Record<VbOccasionId, string[]> = {
  hochzeit: ["elegant-gold", "botanisch", "champagner", "romantik", "boho", "minimal-weiss", "polaroid", "vollbild"],
  geburtstag: ["gold-ballons", "schwarz-gold", "champagner", "bunt-ballons", "neon-geburtstag", "kreide", "party-konfetti", "elegant-gold", "boho", "polaroid", "minimal-weiss"],
  kindergeburtstag: ["dino-dschungel", "feuerwehr-comic", "prinzessin-schloss", "dino", "feuerwehr", "prinzessin", "einhorn", "pirat", "weltraum", "fussball", "bunt-ballons", "kreide"],
  babyparty: ["minimal-weiss", "champagner", "bunt-ballons", "romantik", "boho", "polaroid"],
  party: ["neon-geburtstag", "bunt-ballons", "schwarz-gold", "kreide", "neon", "party-konfetti", "polaroid", "vollbild"],
  firma: ["corporate", "schwarz-gold", "elegant-gold", "minimal-weiss", "polaroid", "vollbild"],
  weihnachtsfeier: ["winterzauber", "schwarz-gold", "elegant-gold", "corporate", "kreide", "polaroid"],
  messe: ["corporate", "minimal-weiss", "elegant-gold", "vollbild"],
  sonstiges: ["polaroid", "gold-ballons", "schwarz-gold", "champagner", "bunt-ballons", "neon-party", "kreide", "botanisch", "elegant-gold", "minimal-weiss", "boho", "vollbild"],
};

export function templatesFor(occasion: VbOccasionId, defaultId?: string): VbTemplate[] {
  const ids = FOR_OCCASION[occasion] ?? [];
  const ordered = defaultId ? [defaultId, ...ids.filter((i) => i !== defaultId)] : ids;
  return ordered.map((id) => VB_TEMPLATES.find((t) => t.id === id)).filter((t): t is VbTemplate => Boolean(t));
}

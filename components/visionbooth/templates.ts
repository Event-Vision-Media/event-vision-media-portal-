// Design-Vorlagen für VisionBooth. Eine Vorlage legt Farben, Schriften, Fotorahmen und
// Verzierung fest – der Kunde ändert nur Titel, Unterzeile, Akzentfarbe und Logo.
// Gilt für Einzelfoto, Fotostreifen und Story (siehe frame.ts).

export type FontRole = "display" | "ui" | "script" | "hand";
export type PhotoStyle = "double" | "thin" | "arch" | "neon" | "rounded" | "polaroid" | "bleed" | "corporate";
export type Decor = "none" | "confetti" | "snow" | "hearts" | "sparkle";

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
];

export const DEFAULT_TEMPLATE = "elegant-gold";

/** Alte Rahmen-Stile (vor den Vorlagen) auf Vorlagen abbilden. */
const LEGACY: Record<string, string> = { gold: "elegant-gold", weiss: "minimal-weiss", schwarz: "elegant-gold", ohne: "vollbild" };

export function getTemplate(id: string | null | undefined): VbTemplate {
  const key = id && (VB_TEMPLATES.some((t) => t.id === id) ? id : LEGACY[id]);
  return VB_TEMPLATES.find((t) => t.id === key) ?? VB_TEMPLATES[0];
}

// Tippspiel „Gender Reveal“: Gäste tippen vor dem Foto, der Rahmen bekommt ihre Farbe,
// die Foto-Wand zeigt den Live-Stand – und die Eltern lösen im Kundenbereich auf.

export interface RevealOption {
  id: "a" | "b";
  label: string;
  emoji: string;
  color: string;
}

export interface RevealConfig {
  enabled: boolean;
  question: string;
  options: [RevealOption, RevealOption];
  /** Auflösung (Option-ID) – null = noch geheim */
  result: "a" | "b" | null;
  revealedAt: string | null;
}

export const REVEAL_DEFAULT: RevealConfig = {
  enabled: false,
  question: "Junge oder Mädchen? Gib deinen Tipp ab!",
  options: [
    { id: "a", label: "Mädchen", emoji: "👧", color: "#ec6fa8" },
    { id: "b", label: "Junge", emoji: "👦", color: "#4f9de8" },
  ],
  result: null,
  revealedAt: null,
};

const hex = (v: unknown, fb: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fb);
const clip = (v: unknown, n: number, fb: string) => String(v ?? "").trim().slice(0, n) || fb;

export function parseReveal(raw: unknown): RevealConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<RevealConfig>;
  const o = Array.isArray(r.options) ? r.options : [];
  const opt = (i: 0 | 1): RevealOption => {
    const d = REVEAL_DEFAULT.options[i];
    const x = (o[i] ?? {}) as Partial<RevealOption>;
    return { id: d.id, label: clip(x.label, 20, d.label), emoji: clip(x.emoji, 8, d.emoji), color: hex(x.color, d.color) };
  };
  return {
    enabled: r.enabled === true,
    question: clip(r.question, 80, REVEAL_DEFAULT.question),
    options: [opt(0), opt(1)],
    result: r.result === "a" || r.result === "b" ? r.result : null,
    revealedAt: typeof r.revealedAt === "string" ? r.revealedAt : null,
  };
}

export interface RevealState {
  question: string;
  options: [RevealOption, RevealOption];
  counts: { a: number; b: number };
  result: "a" | "b" | null;
  mine: "a" | "b" | null;
  /** Gäste mit richtigem Tipp (nur nach Auflösung, Spitznamen) */
  winners?: string[];
}

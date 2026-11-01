// Zeichnet VisionBooth-Bilder im Design der gewählten Vorlage (templates.ts): Einzelfoto (4:5),
// Fotostreifen, Live-Vorschau und Story-Version. Vorschau und Ergebnis sind identisch.

import { getTemplate, type FontRole, type VbTemplate } from "./templates";

export const FRAME_W = 1080;
export const FRAME_H = 1350;

/** Schriftfamilien für das Canvas (aus next/font, siehe loadVbFonts). */
export interface VbFonts {
  display: string;
  ui: string;
  script: string;
  hand: string;
}

export const FALLBACK_FONTS: VbFonts = {
  display: "Georgia, 'Times New Roman', serif",
  ui: "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
  script: "'Snell Roundhand', 'Brush Script MT', cursive",
  hand: "'Marker Felt', 'Comic Sans MS', cursive",
};

export interface FrameOptions {
  template: string;
  text: string;
  subtext?: string;
  accent: string;
  logo?: HTMLImageElement | null;
  /** Spiegeln wie im Selfie-Spiegel (Frontkamera). */
  mirror?: boolean;
  fonts?: VbFonts;
}

/**
 * Schriften aus den CSS-Variablen der VisionBooth-Seiten lesen und laden, bevor gezeichnet wird
 * (Canvas wartet nicht von selbst auf Webfonts).
 */
export async function loadVbFonts(el: Element | null): Promise<VbFonts> {
  if (!el) return FALLBACK_FONTS;
  const cs = getComputedStyle(el);
  const read = (v: string, fb: string) => {
    const f = cs.getPropertyValue(v).trim();
    return f ? `${f}, ${fb}` : fb;
  };
  const fonts: VbFonts = {
    display: read("--vb-font-display", FALLBACK_FONTS.display),
    ui: read("--vb-font-ui", FALLBACK_FONTS.ui),
    script: read("--vb-font-script", FALLBACK_FONTS.script),
    hand: read("--vb-font-hand", FALLBACK_FONTS.hand),
  };
  try {
    await Promise.all([
      document.fonts.load(`600 60px ${fonts.display}`),
      document.fonts.load(`italic 500 60px ${fonts.display}`),
      document.fonts.load(`800 60px ${fonts.ui}`),
      document.fonts.load(`400 60px ${fonts.ui}`),
      document.fonts.load(`400 60px ${fonts.script}`),
      document.fonts.load(`600 60px ${fonts.hand}`),
    ]);
  } catch {
    /* dann eben Ersatzschrift */
  }
  return fonts;
}

/** Schriftfarbe auf der Akzentfarbe: dunkel auf hellen, weiß auf dunklen Farben. */
export function onAccent(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? "#0d0d0f" : "#ffffff";
}

// ---------- Hilfsfunktionen ----------

const col = (c: string, accent: string) => (c === "accent" ? accent : c);
const fam = (o: FrameOptions, role: FontRole) => (o.fonts ?? FALLBACK_FONTS)[role];

/** Deterministischer Zufall, damit Konfetti/Schnee in Vorschau und Ergebnis gleich liegen. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Schriftgröße so weit verkleinern, bis der Text in die Breite passt. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, font: (s: number) => string) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = font(size);
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = font(size);
  return size;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function archPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

export function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, x: number, y: number, w: number, h: number, mirror: boolean) {
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  const sx = (sw - cw) / 2;
  const sy = (sh - ch) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  } else {
    ctx.drawImage(src, sx, sy, cw, ch, x, y, w, h);
  }
  ctx.restore();
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Foto in die Fläche zeichnen, mit Rahmenform der Vorlage. */
function photoInBox(ctx: CanvasRenderingContext2D, t: VbTemplate, src: CanvasImageSource | null, sw: number, sh: number, b: Box, accent: string, mirror: boolean) {
  const clip = () => {
    if (t.photo === "arch") archPath(ctx, b.x, b.y, b.w, b.h);
    else if (t.photo === "rounded" || t.photo === "neon") roundRect(ctx, b.x, b.y, b.w, b.h, 28);
    else {
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
    }
  };
  if (t.photo === "polaroid") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#ddd";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
  ctx.save();
  clip();
  ctx.clip();
  if (src && sw && sh) drawCover(ctx, src, sw, sh, b.x, b.y, b.w, b.h, mirror);
  else {
    ctx.fillStyle = "#1a1a1d";
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  ctx.restore();

  // Rahmenlinien
  ctx.save();
  if (t.photo === "double") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x - 12, b.y - 12, b.w + 24, b.h + 24);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(b.x - 22, b.y - 22, b.w + 44, b.h + 44);
  } else if (t.photo === "thin") {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
  } else if (t.photo === "arch") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    archPath(ctx, b.x - 12, b.y - 12, b.w + 24, b.h + 24);
    ctx.stroke();
  } else if (t.photo === "neon") {
    for (const [c, blur, w, off] of [
      [accent, 34, 6, 0],
      ["#4de8ff", 26, 3, 14],
    ] as const) {
      ctx.shadowColor = c;
      ctx.shadowBlur = blur;
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      roundRect(ctx, b.x - 10 - off, b.y - 10 - off, b.w + 20 + off * 2, b.h + 20 + off * 2, 32 + off);
      ctx.stroke();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function decorate(ctx: CanvasRenderingContext2D, t: VbTemplate, W: number, H: number, accent: string, seed: number) {
  const r = rng(seed);
  if (t.decor === "confetti") {
    const colors = [accent, "#ffc93c", "#3ec7ff", "#7c5cff", "#2ee59d"];
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = r() * H;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI);
      ctx.fillStyle = colors[i % colors.length];
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 6 + r() * 6, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-4, -10, 8 + r() * 6, 18 + r() * 8);
      ctx.restore();
    }
  } else if (t.decor === "snow") {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.45})`;
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 2 + r() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/** Titel, Unterzeile, Logo und Marke im Textband. */
function textBand(ctx: CanvasRenderingContext2D, t: VbTemplate, o: FrameOptions, area: Box, opts: { logoLeft?: boolean; light?: boolean } = {}) {
  const ink = col(t.ink, o.accent);
  const sub = col(t.sub, o.accent);
  let left = area.x;
  const hasLogo = Boolean(o.logo && o.logo.naturalWidth);
  let titleY = area.y + area.h * (o.subtext ? 0.46 : 0.56);

  if (hasLogo && opts.logoLeft) {
    const s = Math.min((area.h * 0.62) / o.logo!.naturalHeight, 300 / o.logo!.naturalWidth);
    const lw = o.logo!.naturalWidth * s;
    const lh = o.logo!.naturalHeight * s;
    ctx.drawImage(o.logo!, area.x + 10, area.y + area.h / 2 - lh / 2 - 10, lw, lh);
    left = area.x + 10 + lw + 30;
  } else if (hasLogo) {
    const s = Math.min(84 / o.logo!.naturalHeight, 240 / o.logo!.naturalWidth);
    const lw = o.logo!.naturalWidth * s;
    const lh = o.logo!.naturalHeight * s;
    ctx.drawImage(o.logo!, area.x + area.w / 2 - lw / 2, area.y + 6, lw, lh);
    titleY = area.y + 6 + lh + area.h * 0.3;
  }
  const w = area.x + area.w - left;
  const cx = opts.logoLeft && hasLogo ? left : left + w / 2;
  ctx.textAlign = opts.logoLeft && hasLogo ? "left" : "center";
  ctx.textBaseline = "alphabetic";

  const title = t.titleUpper ? o.text.toUpperCase() : o.text;
  const titleFont = (s: number) => `${t.titleItalic ? "italic " : ""}${t.titleWeight} ${s}px ${fam(o, t.titleFont)}`;
  ctx.save();
  if (t.photo === "neon") {
    ctx.shadowColor = o.accent;
    ctx.shadowBlur = 24;
  }
  if (t.titleUpper) (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "4px";
  ctx.fillStyle = opts.light ? "#ffffff" : ink;
  const titleSize = fitFont(ctx, title, w - 30, t.titleSize, 28, titleFont);
  const titleW = ctx.measureText(title).width;
  ctx.fillText(title, cx, titleY);
  ctx.restore();

  // kleine Verzierungen rund um den Titel
  if (t.decor === "hearts" || t.decor === "sparkle") {
    const tw = Math.min(titleW, w - 30);
    ctx.save();
    ctx.fillStyle = o.accent;
    const y = titleY - titleSize * 0.45;
    const dx = Math.min(tw / 2 + 40, w / 2 - 20);
    if (t.decor === "hearts") {
      heart(ctx, cx - dx, y - 8, 22);
      heart(ctx, cx + dx, y - 8, 22);
    } else {
      sparkle(ctx, cx - dx, y, 14);
      sparkle(ctx, cx + dx, y, 14);
      sparkle(ctx, cx + dx + 26, y - 22, 7);
    }
    ctx.restore();
  }

  let y = titleY;
  if (o.subtext) {
    const st = t.subUpper ? o.subtext.toUpperCase() : o.subtext;
    ctx.save();
    if (t.subUpper) (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "5px";
    ctx.fillStyle = opts.light ? "rgba(255,255,255,0.85)" : sub;
    const subSize = t.subFont === "hand" ? 40 : 26;
    fitFont(ctx, st, w - 40, subSize, 16, (s) => `${t.subFont === "ui" ? 600 : 500} ${s}px ${fam(o, t.subFont)}`);
    y = titleY + subSize + 22;
    ctx.fillText(st, cx, y);
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = opts.light ? "rgba(255,255,255,0.6)" : sub;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 18px ${fam(o, "ui")}`;
  ctx.textAlign = "center";
  ctx.fillText("VisionBooth by Event Vision Media", area.x + area.w / 2, area.y + area.h - 16);
  ctx.restore();
}

// ---------- Einzelfoto ----------

export function drawFrame(ctx: CanvasRenderingContext2D, src: CanvasImageSource | null, sw: number, sh: number, o: FrameOptions) {
  const W = FRAME_W;
  const H = FRAME_H;
  const t = getTemplate(o.template);
  const mirror = Boolean(o.mirror);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  if (t.photo === "bleed") {
    photoInBox(ctx, t, src, sw, sh, { x: 0, y: 0, w: W, h: H }, o.accent, mirror);
    const g = ctx.createLinearGradient(0, H - 380, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 380, W, 380);
    textBand(ctx, t, o, { x: 60, y: H - 250, w: W - 120, h: 240 }, { light: true });
    return;
  }

  if (t.photo === "corporate") {
    photoInBox(ctx, t, src, sw, sh, { x: 0, y: 0, w: W, h: 1080 }, o.accent, mirror);
    ctx.fillStyle = o.accent;
    ctx.fillRect(0, 1080, W, 14);
    textBand(ctx, t, o, { x: 50, y: 1094, w: W - 100, h: H - 1094 }, { logoLeft: true });
    return;
  }

  decorate(ctx, t, W, H, o.accent, 7);
  if (t.photo === "polaroid") {
    const b = { x: 70, y: 70, w: W - 140, h: W - 140 };
    photoInBox(ctx, t, src, sw, sh, b, o.accent, mirror);
    textBand(ctx, t, o, { x: 60, y: b.y + b.h + 10, w: W - 120, h: H - (b.y + b.h + 10) });
    return;
  }
  const pad = 56;
  const band = 250;
  const b = { x: pad, y: pad, w: W - pad * 2, h: H - pad - band };
  photoInBox(ctx, t, src, sw, sh, b, o.accent, mirror);
  textBand(ctx, t, o, { x: pad, y: b.y + b.h + 16, w: W - pad * 2, h: H - (b.y + b.h + 16) });
}

// ---------- Fotostreifen (3 Fotos untereinander) ----------

export const STRIP_W = 1080;
export const STRIP_H = 2400;
export const STRIP_SHOTS = 3;
/** Ein Feld im Streifen (Querformat ca. 3:2) */
export const CELL_W = 980;
export const CELL_H = 640;
const STRIP_PAD = 50;
const STRIP_GAP = 30;

export interface Shot {
  src: CanvasImageSource;
  w: number;
  h: number;
}

/** Für den Streifen passende Fotoform (Bogen/Vollbild/Polaroid passen dort nicht). */
function stripTemplate(t: VbTemplate): VbTemplate {
  if (t.photo === "arch" || t.photo === "polaroid") return { ...t, photo: "rounded" };
  if (t.photo === "bleed" || t.photo === "corporate") return { ...t, photo: "thin", bg: t.photo === "bleed" ? "#0d0d0f" : t.bg, ink: t.photo === "bleed" ? "#ffffff" : t.ink };
  return t;
}

/** Fertiger Fotostreifen. Die Fotos sind bereits als Ausschnitt (CELL_W×CELL_H) aufgenommen. */
export function drawStrip(ctx: CanvasRenderingContext2D, shots: Shot[], o: FrameOptions) {
  const W = STRIP_W;
  const H = STRIP_H;
  const t = stripTemplate(getTemplate(o.template));
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  decorate(ctx, t, W, H, o.accent, 11);
  for (let i = 0; i < STRIP_SHOTS; i++) {
    const y = STRIP_PAD + i * (CELL_H + STRIP_GAP);
    const s = shots[i];
    photoInBox(ctx, { ...t, photo: t.photo === "double" ? "thin" : t.photo }, s?.src ?? null, s?.w ?? 0, s?.h ?? 0, { x: STRIP_PAD, y, w: CELL_W, h: CELL_H }, o.accent, false);
  }
  const top = STRIP_PAD + STRIP_SHOTS * (CELL_H + STRIP_GAP);
  if (getTemplate(o.template).photo === "corporate") {
    ctx.fillStyle = o.accent;
    ctx.fillRect(0, top - 10, W, 12);
  }
  textBand(ctx, t, o, { x: 60, y: top, w: W - 120, h: H - top });
}

/**
 * Live-Vorschau im Streifen-Modus (Format wie das Einzelfoto, damit die Kamera groß bleibt):
 * oben das Live-Bild im Streifen-Ausschnitt, darunter die drei Felder mit den bisherigen Fotos.
 */
export function drawStripPreview(ctx: CanvasRenderingContext2D, live: Shot | null, shots: Shot[], current: number, o: FrameOptions) {
  const W = FRAME_W;
  const H = FRAME_H;
  const t = stripTemplate(getTemplate(o.template));
  const ink = col(t.ink, o.accent);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  if (live) drawCover(ctx, live.src, live.w, live.h, 50, 60, CELL_W, CELL_H, Boolean(o.mirror));
  ctx.strokeStyle = o.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 52, CELL_W + 16, CELL_H + 16);

  const tw = 300;
  const th = Math.round((tw * CELL_H) / CELL_W);
  for (let i = 0; i < STRIP_SHOTS; i++) {
    const x = 50 + i * (tw + 40);
    const y = 770;
    const s = shots[i];
    if (s) drawCover(ctx, s.src, s.w, s.h, x, y, tw, th, false);
    else {
      ctx.fillStyle = "rgba(128,128,128,0.25)";
      ctx.fillRect(x, y, tw, th);
      ctx.fillStyle = "rgba(128,128,128,0.8)";
      ctx.font = `bold 64px ${fam(o, "display")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + tw / 2, y + th / 2);
    }
    ctx.strokeStyle = i === current ? o.accent : "rgba(128,128,128,0.4)";
    ctx.lineWidth = i === current ? 5 : 2;
    ctx.strokeRect(x - 4, y - 4, tw + 8, th + 8);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink;
  ctx.font = `600 48px ${fam(o, "display")}`;
  ctx.fillText(`Fotostreifen · Foto ${Math.min(current + 1, STRIP_SHOTS)} von ${STRIP_SHOTS}`, W / 2, 1120);
  ctx.fillStyle = col(t.sub, o.accent);
  ctx.font = `500 26px ${fam(o, "ui")}`;
  ctx.fillText("Nach jedem Foto geht's automatisch weiter", W / 2, 1180);
}

// ---------- Story-Version (9:16 für Instagram/WhatsApp-Status) ----------

export const STORY_W = 1080;
export const STORY_H = 1920;

/** Fertiges Bild (Einzelfoto oder Streifen) mittig auf einem 9:16-Hintergrund in Event-Farbe. */
export function drawStory(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, accent: string) {
  const W = STORY_W;
  const H = STORY_H;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, a: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, a);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.25, H * 0.15, 900, `${accent}66`);
  glow(W * 0.8, H * 0.85, 800, `${accent}40`);

  const maxW = 920;
  const maxH = 1560;
  const s = Math.min(maxW / iw, maxH / ih);
  const w = iw * s;
  const h = ih * s;
  const x = (W - w) / 2;
  const y = (H - h) / 2 - 20;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.drawImage(img, x, y, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 30px system-ui, -apple-system, sans-serif`;
  ctx.fillText("V I S I O N B O O T H", W / 2, H - 70);
}

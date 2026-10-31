// Zeichnet ein VisionBooth-Foto im Event-Rahmen (Hochformat 4:5). Wird für die Live-Vorschau
// (jedes Kamerabild) und für das fertige Foto benutzt – Vorschau und Ergebnis sind identisch.

export const FRAME_W = 1080;
export const FRAME_H = 1350;

export type FrameStyle = "gold" | "weiss" | "schwarz" | "ohne";

export interface FrameOptions {
  style: FrameStyle;
  text: string;
  accent: string;
  logo?: HTMLImageElement | null;
  /** Spiegeln wie im Selfie-Spiegel (Frontkamera). */
  mirror?: boolean;
}

/** Schriftfarbe auf der Akzentfarbe: dunkel auf hellen, weiß auf dunklen Farben. */
export function onAccent(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? "#0d0d0f" : "#ffffff";
}

const SERIF = "Georgia, 'Times New Roman', serif";

function palette(style: FrameStyle, accent: string) {
  if (style === "weiss") return { bg: "#faf8f4", text: "#2b3037", sub: "rgba(43,48,55,0.55)", line: accent };
  if (style === "schwarz") return { bg: "#0d0d0f", text: "#ffffff", sub: "rgba(255,255,255,0.5)", line: "rgba(255,255,255,0.35)" };
  return { bg: "#0d0d0f", text: accent, sub: "rgba(255,255,255,0.5)", line: accent };
}

/** Schriftgröße so weit verkleinern, bis der Text in die Breite passt. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, family: string) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = `${size}px ${family}`;
  return size;
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

export function drawFrame(ctx: CanvasRenderingContext2D, src: CanvasImageSource | null, sw: number, sh: number, o: FrameOptions) {
  const W = FRAME_W;
  const H = FRAME_H;
  const p = palette(o.style, o.accent);
  const mirror = Boolean(o.mirror);

  if (o.style === "ohne") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (src && sw && sh) drawCover(ctx, src, sw, sh, 0, 0, W, H, mirror);
    const g = ctx.createLinearGradient(0, H - 260, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 260, W, 260);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    fitFont(ctx, o.text, W - 120, 60, 28, SERIF);
    ctx.fillText(o.text, W / 2, H - 70);
    return;
  }

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 44;
  const band = 200;
  const px = pad;
  const py = pad;
  const pw = W - pad * 2;
  const ph = H - pad - band;

  if (src && sw && sh) drawCover(ctx, src, sw, sh, px, py, pw, ph, mirror);
  else {
    ctx.fillStyle = "#1a1a1d";
    ctx.fillRect(px, py, pw, ph);
  }

  // feine Doppellinie um das Foto
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(px - 12, py - 12, pw + 24, ph + 24);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(px - 22, py - 22, pw + 44, ph + 44);
  ctx.globalAlpha = 1;

  // Textband unten
  const bandTop = py + ph + 12;
  const bandMid = bandTop + (H - bandTop) / 2;
  let textLeft = pad;
  if (o.logo && o.logo.naturalWidth) {
    const maxH = 110;
    const maxW = 220;
    const s = Math.min(maxH / o.logo.naturalHeight, maxW / o.logo.naturalWidth);
    const lw = o.logo.naturalWidth * s;
    const lh = o.logo.naturalHeight * s;
    ctx.drawImage(o.logo, pad + 10, bandMid - lh / 2 - 6, lw, lh);
    textLeft = pad + 10 + lw + 24;
  }
  const textW = W - pad - textLeft;
  const cx = textLeft + textW / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.text;
  fitFont(ctx, o.text, textW - 20, 66, 30, SERIF);
  ctx.fillText(o.text, cx, bandMid + 8);
  ctx.fillStyle = p.sub;
  ctx.font = `22px system-ui, -apple-system, sans-serif`;
  ctx.fillText("VisionBooth by Event Vision Media", cx, bandMid + 52);
}

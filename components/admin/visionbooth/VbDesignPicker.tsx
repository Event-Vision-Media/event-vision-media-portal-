"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawFrame,
  FRAME_H,
  FRAME_W,
  loadVbFonts,
  onArtReady,
  type VbFonts,
} from "@/components/visionbooth/frame";
import { templatesFor, VB_TEMPLATES, type VbTemplate } from "@/components/visionbooth/templates";
import { getOccasion, VB_OCCASIONS, type VbOccasionId } from "@/components/visionbooth/packages";

/** Beispielfoto für die Vorschau (gezeichnet, keine echten Personen). */
function samplePhoto(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 1500;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 1200, 1500);
  g.addColorStop(0, "#c9b8a6");
  g.addColorStop(1, "#7d8fa3");
  x.fillStyle = g;
  x.fillRect(0, 0, 1200, 1500);
  const person = (cx: number, skin: string, shirt: string, hair: string) => {
    x.fillStyle = shirt;
    x.beginPath();
    x.ellipse(cx, 1380, 250, 330, 0, Math.PI, 0);
    x.fill();
    x.fillStyle = skin;
    x.beginPath();
    x.arc(cx, 780, 150, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = hair;
    x.beginPath();
    x.arc(cx, 740, 158, Math.PI * 1.05, Math.PI * 1.95);
    x.fill();
  };
  person(440, "#e9c4a6", "#2d3446", "#3b2a20");
  person(780, "#d9a98a", "#f1ece4", "#6b4a2f");
  return c;
}

interface Props {
  template: string;
  onTemplate: (id: string, accent: string) => void;
  text: string;
  subtext: string;
  accent: string;
  logoUrl: string | null;
  /** Anlass des Events – passende Designs stehen dann oben. */
  occasion?: string | null;
}

/** Vorlagen-Galerie mit kleinen Vorschaubildern und große Live-Vorschau des Einzelfotos. */
export function VbDesignPicker({
  template,
  onTemplate,
  text,
  subtext,
  accent,
  logoUrl,
  occasion,
}: Props) {
  const bigRef = useRef<HTMLCanvasElement>(null);
  const thumbsRef = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [fonts, setFonts] = useState<VbFonts | undefined>();
  const [artTick, setArtTick] = useState(0);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const photo = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    photo.current = samplePhoto();
    loadVbFonts(wrapRef.current).then(setFonts);
    return onArtReady(() => setArtTick((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!logoUrl) return setLogo(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogo(img);
    img.src = logoUrl;
  }, [logoUrl]);

  const shownText = text || "Anna & Max";
  const shownSub = subtext;

  // Große Vorschau
  useEffect(() => {
    const c = bigRef.current;
    if (!c || !photo.current) return;
    drawFrame(c.getContext("2d")!, photo.current, 1200, 1500, {
      template,
      text: shownText,
      subtext: shownSub,
      accent,
      logo,
      fonts,
    });
  }, [template, shownText, shownSub, accent, logo, fonts, artTick]);

  // Kleine Vorschaubilder (in Originalfarben der Vorlage)
  useEffect(() => {
    if (!photo.current) return;
    for (const t of VB_TEMPLATES) {
      const c = thumbsRef.current[t.id];
      if (!c) continue;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(c.width / FRAME_W, 0, 0, c.height / FRAME_H, 0, 0);
      drawFrame(ctx, photo.current, 1200, 1500, {
        template: t.id,
        text: shownText,
        subtext: shownSub || "14.11.2026",
        accent: t.accent,
        fonts,
      });
    }
  }, [shownText, shownSub, fonts, artTick]);

  return (
    <div ref={wrapRef} className="grid gap-5 sm:grid-cols-[1fr_200px]">
      <div className="space-y-5">
        {(() => {
          const fit = occasion && VB_OCCASIONS.some((o) => o.id === occasion) ? templatesFor(occasion as VbOccasionId, getOccasion(occasion).template) : [];
          const fitIds = new Set(fit.map((t) => t.id));
          const rest = VB_TEMPLATES.filter((t) => !fitIds.has(t.id));
          const groups: [string, string, VbTemplate[]][] = [
            ["Passend zu eurem Anlass", "Unsere Empfehlungen für euer Event.", fit],
            [fit.length ? "Weitere gestaltete Designs" : "Gestaltete Designs", "Fertig gestaltet – ihr ändert Text und Textfarbe.", rest.filter((t) => t.art)],
            ["Schlicht & anpassbar", "Farbe, Text und Logo frei einstellbar.", rest.filter((t) => !t.art)],
          ];
          return groups.filter(([, , list]) => list.length);
        })().map(([title, hint, list]) => (
          <div key={title}>
            <p className="text-sm font-semibold text-anthracite-800">{title}</p>
            <p className="mb-2 text-xs text-anthracite-400">{hint}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-3">
              {list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTemplate(t.id, t.accent)}
                  className={`overflow-hidden rounded-xl border-2 bg-white text-left transition ${t.id === template ? "border-gold-500 shadow-glow" : "border-transparent hover:border-anthracite-200"}`}
                >
                  <canvas
                    ref={(el) => {
                      thumbsRef.current[t.id] = el;
                    }}
                    width={216}
                    height={270}
                    className="block w-full"
                  />
                  <span className="block px-2 pt-1.5 text-xs font-semibold text-anthracite-800">
                    {t.name}
                  </span>
                  <span className="block px-2 pb-2 text-[10px] leading-tight text-anthracite-400">
                    {t.occasions}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="order-first mx-auto w-full max-w-[220px] sm:order-none sm:sticky sm:top-24 sm:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-anthracite-400">
          Live-Vorschau
        </p>
        <canvas
          ref={bigRef}
          width={FRAME_W}
          height={FRAME_H}
          className="block w-full rounded-lg shadow-card"
        />
        <p className="mt-2 text-[11px] text-anthracite-400">
          Beispielfoto · so sieht ein Einzelfoto der Gäste aus.
        </p>
      </div>
    </div>
  );
}

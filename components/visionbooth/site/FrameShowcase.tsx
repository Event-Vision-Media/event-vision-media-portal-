"use client";

import { useEffect, useRef, useState } from "react";
import { drawFrame, FRAME_H, FRAME_W, loadVbFonts, onArtReady, type VbFonts } from "@/components/visionbooth/frame";
import { getTemplate } from "@/components/visionbooth/templates";

/** Beispiel-Rahmen für die Anlass-Seiten – gezeichnet wie in der echten VisionBooth (fiktive Personen). */
export function FrameShowcase({ items }: { items: { template: string; text: string; sub?: string }[] }) {
  const [ready, setReady] = useState(0);
  const img = useRef<HTMLImageElement | null>(null);
  const fonts = useRef<VbFonts | undefined>(undefined);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      img.current = i;
      setReady((n) => n + 1);
    };
    i.src = "/visionbooth/stile/original.webp";
    loadVbFonts(canvases.current[0] ?? null).then((f) => {
      fonts.current = f;
      setReady((n) => n + 1);
    });
    return onArtReady(() => setReady((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!img.current) return;
    items.forEach((it, k) => {
      const c = canvases.current[k];
      if (!c) return;
      const t = getTemplate(it.template);
      drawFrame(c.getContext("2d")!, img.current!, img.current!.naturalWidth, img.current!.naturalHeight, {
        template: t.id,
        text: it.text,
        subtext: it.sub ?? "",
        accent: t.accent,
        fonts: fonts.current,
      });
    });
  }, [ready, items]);

  return (
    <div className="vb-scroll flex gap-4 overflow-x-auto px-5 pb-3 md:mx-auto md:grid md:max-w-5xl md:grid-cols-3 md:overflow-visible">
      {items.map((it, k) => (
        <figure key={it.template} className="w-[62vw] max-w-[260px] flex-none md:w-auto md:max-w-none">
          <canvas
            ref={(el) => {
              canvases.current[k] = el;
            }}
            width={FRAME_W}
            height={FRAME_H}
            className="w-full rounded-2xl shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
          />
          <figcaption className="mt-3 text-center text-[13px] font-semibold text-white/60">{getTemplate(it.template).name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

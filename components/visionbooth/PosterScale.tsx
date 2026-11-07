"use client";

import { useEffect, useRef, useState } from "react";

const PRINT_CSS =
  "@media print { .vb-poster-scale { height: auto !important; overflow: visible !important } .vb-poster-inner { transform: none !important; margin-left: auto !important; margin-right: auto !important } }";

/**
 * Zeigt den A5-Aufsteller am Bildschirm passend zur Displaybreite verkleinert (Handy).
 * Beim Drucken wird nicht skaliert – dort bleibt er exakt A5.
 */
export function PosterScale({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height?: number; left?: number }>({ scale: 1 });

  useEffect(() => {
    const measure = () => {
      const o = outer.current;
      const el = inner.current;
      if (!o || !el) return;
      const s = Math.min(1, (o.clientWidth - 24) / el.offsetWidth);
      setFit({ scale: s, height: el.offsetHeight * s, left: (o.clientWidth - el.offsetWidth * s) / 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={outer} className="vb-poster-scale" style={{ height: fit.height, overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div
        ref={inner}
        className="vb-poster-inner w-[148mm]"
        style={{ transform: `scale(${fit.scale})`, transformOrigin: "top left", marginLeft: fit.left ?? "auto", marginRight: fit.left === undefined ? "auto" : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

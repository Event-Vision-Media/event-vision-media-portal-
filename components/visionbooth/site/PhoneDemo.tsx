"use client";

import { useEffect, useState } from "react";

const SHOTS = [
  { key: "original", label: "📸 Dein Foto" },
  { key: "glamour", label: "🎬 Hollywood-Glamour" },
  { key: "superheld", label: "🦸 Superheld" },
  { key: "animation", label: "🧸 3D-Animation" },
  { key: "comic", label: "💥 Comic" },
  { key: "vintage", label: "🕺 Vintage" },
];

/** Handy-Attrappe auf der Startseite: wechselt zwischen Foto und KI-Stilen (fiktive Personen). */
export function PhoneDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SHOTS.length), 2400);
    return () => clearInterval(t);
  }, []);
  const s = SHOTS[i];
  return (
    <div className="relative mx-auto w-[250px] sm:w-[280px]">
      <div className="absolute -inset-10 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--a) 55%, transparent), transparent 70%)" }} />
      <div className="relative rounded-[44px] border border-white/15 bg-[#0b0b0d] p-3 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]">
        <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative overflow-hidden rounded-[34px]" style={{ aspectRatio: "9 / 17" }}>
          <div className="absolute inset-0 flex flex-col bg-[#0a0a0c] px-3 pb-4 pt-10">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">VisionBooth</p>
            <p className="vb-display vb-gold-text mt-1 text-center text-xl font-semibold">Anna &amp; Max</p>
            <div className="relative mt-3 flex-1 overflow-hidden rounded-2xl ring-2" style={{ ["--tw-ring-color" as string]: "var(--a)" }}>
              <img key={s.key} src={`/visionbooth/stile/${s.key}.webp`} alt="" className="vb-fade absolute inset-0 h-full w-full object-cover" />
              <span key={`l${s.key}`} className="vb-fade absolute bottom-2 left-2 right-2 rounded-full bg-black/60 px-2 py-1 text-center text-[11px] font-semibold backdrop-blur">
                {s.label}
              </span>
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {SHOTS.map((x, n) => (
                <span key={x.key} className="h-1.5 rounded-full transition-all" style={{ width: n === i ? 18 : 6, background: n === i ? "var(--a)" : "rgba(255,255,255,0.25)" }} />
              ))}
            </div>
            <div className="vb-btn mt-3 rounded-full py-2.5 text-center text-[13px] font-bold">Speichern &amp; teilen</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-white/40">Beispielbilder mit KI-generierten Personen</p>
    </div>
  );
}

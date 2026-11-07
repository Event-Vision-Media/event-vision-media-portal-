"use client";

import { useRef, useState } from "react";

const TONES = ["var(--a)", "#2a2a30", "color-mix(in srgb, var(--a) 60%, #fff)", "#3a3a42"];

/**
 * Foto-Glücksrad: drehen, Aufgabe lesen, Foto machen. Ohne Punkte und ohne Anmeldung.
 */
export function PhotoWheel({ items, onDone, onClose }: { items: string[]; onDone: (task: string) => void; onClose: () => void }) {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lastRef = useRef<number | null>(null);
  const n = items.length;
  const seg = 360 / n;

  function spin() {
    if (spinning) return;
    let pick = Math.floor(Math.random() * n);
    if (n > 1 && pick === lastRef.current) pick = (pick + 1 + Math.floor(Math.random() * (n - 1))) % n;
    lastRef.current = pick;
    // Zeiger steht oben: Segment-Mitte muss nach der Drehung bei 0° liegen
    const target = 360 - (pick * seg + seg / 2);
    const next = angle - (angle % 360) + 360 * 5 + target;
    setResult(null);
    setSpinning(true);
    setAngle(next);
    if (navigator.vibrate) navigator.vibrate(15);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(items[pick]);
      if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
    }, 3300);
  }

  const gradient = `conic-gradient(${items.map((_, i) => `${TONES[i % TONES.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(", ")})`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d0f]/[0.97] px-6 backdrop-blur-md" role="dialog" aria-label="Foto-Glücksrad">
      <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg" aria-label="Schließen">
        ✕
      </button>
      <p className="vb-display text-2xl font-semibold">Foto-Glücksrad</p>
      <p className="mt-1 text-center text-sm text-white/60">Dreht am Rad – und macht genau dieses Foto!</p>

      <div className="relative mt-7 h-[280px] w-[280px]">
        <span className="absolute left-1/2 top-[-14px] z-10 h-0 w-0 -translate-x-1/2 border-x-[14px] border-t-[24px] border-x-transparent" style={{ borderTopColor: "#fff", filter: "drop-shadow(0 3px 4px rgba(0,0,0,.5))" }} />
        <div
          className="h-full w-full rounded-full border-[6px] border-white/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
          style={{ background: gradient, transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3.2s cubic-bezier(0.15, 0.85, 0.2, 1)" : "none" }}
        >
          {items.map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 text-[17px] font-bold"
              style={{ transform: `rotate(${i * seg + seg / 2}deg) translateY(-112px) translateX(-50%)`, transformOrigin: "0 0", color: i % 2 ? "#fff" : "#141417" }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            onClick={spin}
            disabled={spinning}
            className="vb-btn pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 text-[15px] font-bold shadow-xl disabled:opacity-80"
          >
            {spinning ? "…" : "Drehen"}
          </button>
        </div>
      </div>

      <div className="mt-8 min-h-[150px] w-full max-w-sm text-center">
        {result ? (
          <div className="vb-pop">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Eure Aufgabe</p>
            <p className="vb-display mt-2 text-[24px] font-semibold leading-tight">{result}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={() => onDone(result)} className="vb-btn w-full rounded-full py-4 text-[16px] font-bold">
                Los, Foto machen!
              </button>
              <button onClick={spin} className="text-sm text-white/60 underline">
                Nochmal drehen
              </button>
            </div>
          </div>
        ) : (
          !spinning && <p className="text-sm text-white/50">Tippe auf „Drehen“.</p>
        )}
      </div>
    </div>
  );
}

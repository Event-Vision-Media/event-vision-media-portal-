"use client";

import { useCallback, useEffect, useState } from "react";
import type { RevealOption, RevealState } from "./reveal";

// Tippspiel (Gender Reveal) in Gäste-App und Foto-Wand.

const POLL_MS = 8000;

/** Stand regelmäßig holen – so kommt die Auflösung live bei allen an. */
export function useRevealState(slug: string, enabled: boolean, guest?: string) {
  const [state, setState] = useState<RevealState | null>(null);
  const load = useCallback(async () => {
    const res = await fetch(`/api/vb/${slug}/tipp`, { headers: guest ? { "x-vb-guest": guest } : {}, cache: "no-store" }).catch(() => null);
    if (res?.ok) setState(await res.json());
  }, [slug, guest]);
  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [enabled, load]);
  return [state, setState, load] as const;
}

export const pct = (s: RevealState) => {
  const all = s.counts.a + s.counts.b;
  return all ? Math.round((s.counts.a / all) * 100) : 50;
};

/** Tipp-Karte auf der Startseite der Gäste-App. */
export function RevealPicker({ state, options, question, onPick }: { state: RevealState | null; options: [RevealOption, RevealOption]; question: string; onPick: (id: "a" | "b") => void }) {
  const mine = state?.mine ?? null;
  const chosen = options.find((o) => o.id === mine);
  return (
    <div className="vb-glass w-full rounded-2xl p-4 text-left">
      <p className="text-[15px] font-semibold text-white">🔮 {question}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const sel = mine === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-3 transition active:scale-95 ${sel ? "vb-pop" : ""}`}
              style={{ background: sel ? o.color : `color-mix(in srgb, ${o.color} 22%, transparent)`, border: `1.5px solid ${o.color}`, color: sel ? "#fff" : "rgba(255,255,255,0.9)" }}
              aria-pressed={sel}
            >
              <span className="text-3xl">{o.emoji}</span>
              <span className="text-[14px] font-bold">{o.label}</span>
            </button>
          );
        })}
      </div>
      {state && (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full">
            <span className="transition-[width] duration-700" style={{ width: `${pct(state)}%`, background: options[0].color }} />
            <span className="flex-1" style={{ background: options[1].color }} />
          </div>
          <p className="mt-1.5 text-[12px] text-white/60">
            {chosen ? `Dein Tipp: ${chosen.emoji} ${chosen.label} – deine Fotos bekommen diese Farbe. ` : "Tippe an – du kannst deinen Tipp bis zur Auflösung ändern. "}
            {state.counts.a + state.counts.b} {state.counts.a + state.counts.b === 1 ? "Tipp" : "Tipps"} bisher
          </p>
        </div>
      )}
    </div>
  );
}

/** Großer Auflösungs-Moment in der Gäste-App. */
export function RevealMoment({ state, onClose }: { state: RevealState; onClose: () => void }) {
  const win = state.options.find((o) => o.id === state.result)!;
  const right = state.mine === state.result;
  return (
    <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center px-8 text-center" style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${win.color} 70%, #000), #0a0a0c 75%)` }}>
      <p className="vb-in text-sm font-semibold uppercase tracking-[0.35em] text-white/80">Die Auflösung</p>
      <p className="vb-points mt-4 text-[7rem] leading-none">{win.emoji}</p>
      <h2 className="vb-display vb-in mt-4 text-5xl font-semibold" style={{ animationDelay: "500ms" }}>
        Es wird ein {win.label}!
      </h2>
      {state.mine && (
        <p className="vb-in mt-4 text-lg text-white/85" style={{ animationDelay: "900ms" }}>
          {right ? "🎉 Du hast richtig getippt!" : "😄 Knapp daneben – aber Glückwunsch an die Eltern!"}
        </p>
      )}
      <button onClick={onClose} className="vb-in mt-10 rounded-full bg-white px-8 py-3.5 text-[16px] font-bold text-[#0d0d0f]" style={{ animationDelay: "1200ms" }}>
        Weiter feiern
      </button>
    </div>
  );
}

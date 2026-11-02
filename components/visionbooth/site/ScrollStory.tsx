"use client";

import { useEffect, useRef, useState } from "react";

// „So läuft euer Abend“: Beim Scrollen bleibt ein Handy stehen, der Bildschirm wechselt mit dem Text.
// Alle Bilder zeigen KI-generierte (fiktive) Personen.

const STEPS = [
  { time: "19:30", title: "QR-Code scannen", text: "Auf jedem Tisch steht euer Aufsteller. Handy-Kamera drauf – die VisionBooth öffnet sich sofort, ganz ohne App." },
  { time: "20:15", title: "Foto mit eurem Rahmen", text: "Countdown, Blitz, fertig: jedes Foto im Design eures Events – mit Namen, Datum und Logo." },
  { time: "21:00", title: "KI-Magie", text: "Ein Tipp auf „Superheld“ – Sekunden später steht die ganze Gruppe im Kostüm über der Skyline." },
  { time: "22:30", title: "Missionen & Bestenliste", text: "„Selfie mit dem Brautpaar“ +30 Punkte. Die Besten erscheinen live auf der Foto-Wand – plötzlich macht jeder mit." },
  { time: "Am Morgen danach", title: "Alle Fotos an einem Ort", text: "Kein Hinterherlaufen in WhatsApp-Gruppen: Die Fotos aller Gäste warten in eurer Galerie – mit einem Klick als ZIP." },
];

export function ScrollStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // Aktiver Schritt = Text, dessen Mitte am nächsten an der Lesehöhe liegt (unterhalb des Handys am Smartphone)
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      const target = window.innerWidth < 768 ? window.innerHeight * 0.72 : window.innerHeight * 0.5;
      let best = 0;
      let dist = Infinity;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - target);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-5 py-16">
      <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
        So läuft <span className="vb-gold-text">euer Abend</span>
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-white/65">Scroll mal durch – genau so erleben es eure Gäste.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_340px] md:gap-16">
        {/* Handy: am Handy oben klebend, am Computer rechts */}
        <div className="sticky top-0 z-10 order-first -mx-5 h-fit bg-gradient-to-b from-[#0a0a0c] from-85% to-transparent px-5 pb-6 pt-3 md:order-last md:top-24 md:mx-0 md:bg-none md:p-0">
          <div className="mx-auto w-[150px] md:w-[300px]">
            <div className="relative rounded-[34px] border border-white/15 bg-[#0b0b0d] p-2 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.95)] md:rounded-[44px] md:p-3">
              <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-black md:top-3 md:h-6 md:w-24" />
              <div className="relative overflow-hidden rounded-[27px] bg-[#0a0a0c] md:rounded-[34px]" style={{ aspectRatio: "9 / 17" }}>
                {[Scan, Shoot, Magic, Mission, Gallery].map((Screen, i) => (
                  <div key={i} className="absolute inset-0 transition-all duration-500" style={{ opacity: active === i ? 1 : 0, transform: active === i ? "none" : "scale(0.96)" }} aria-hidden={active !== i}>
                    <Screen on={active === i} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: active === i ? 18 : 6, background: active === i ? "var(--a)" : "rgba(255,255,255,0.25)" }} />
              ))}
            </div>
          </div>
        </div>

        <div>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="flex min-h-[38vh] items-center md:min-h-[70vh]"
            >
              <div className={`rounded-3xl p-6 transition-all duration-500 ${active === i ? "vb-glass opacity-100" : "opacity-35"}`}>
                <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "var(--a)" }}>
                  {s.time}
                </p>
                <p className="vb-display mt-2 text-2xl font-semibold sm:text-3xl">{s.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70 sm:text-[17px]">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Bildschirme im Handy ---------- */

function Scan({ on }: { on: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#16120c] p-5">
      <div className="relative w-full rounded-2xl bg-[#f5efe4] p-4 text-center text-[#2a2118]">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-60">VisionBooth</p>
        <p className="vb-display mt-1 text-sm font-semibold">Anna &amp; Max</p>
        <div className="mx-auto mt-2 grid h-20 w-20 grid-cols-5 gap-[2px] rounded bg-white p-1.5 md:h-28 md:w-28">
          {Array.from({ length: 25 }, (_, i) => (
            <span key={i} className={(i * 7) % 3 === 0 || [0, 4, 20].includes(i) ? "bg-[#16181c]" : ""} />
          ))}
        </div>
        <p className="mt-2 text-[10px] font-semibold">Mach ein Foto! 📸</p>
      </div>
      {/* Kamera-Sucher mit Scan-Linie */}
      <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/0">
        {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map((c) => (
          <span key={c} className={`absolute h-7 w-7 rounded-md ${c}`} style={{ borderColor: "var(--a)" }} />
        ))}
        {on && <span className="vb-scanline absolute inset-x-2 h-0.5 rounded-full" style={{ background: "var(--a)", boxShadow: "0 0 14px var(--a)" }} />}
      </div>
    </div>
  );
}

function Shoot({ on }: { on: boolean }) {
  return (
    <div className="flex h-full flex-col bg-[#0d0d0f] p-3 pt-8">
      <div className="relative flex-1 overflow-hidden rounded-xl ring-2" style={{ ["--tw-ring-color" as string]: "var(--a)" }}>
        <img src="/visionbooth/stile/original.webp" alt="" className="h-full w-full object-cover" />
        {on && (
          <span key="c" className="vb-story-count vb-display absolute inset-0 flex items-center justify-center text-7xl font-bold text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            3
          </span>
        )}
      </div>
      <p className="vb-display mt-2 text-center text-sm" style={{ color: "var(--a)" }}>
        Anna &amp; Max
      </p>
      <p className="text-center text-[8px] uppercase tracking-[0.25em] text-white/50">14.11.2026</p>
      <div className="mx-auto mt-2 h-10 w-10 rounded-full border-2 border-white/80 p-1">
        <div className="vb-btn h-full w-full rounded-full" />
      </div>
    </div>
  );
}

function Magic({ on }: { on: boolean }) {
  return (
    <div className="relative h-full bg-[#0d0d0f]">
      <img src="/visionbooth/stile/superheld.webp" alt="" className="h-full w-full object-cover" />
      {on && <span className="vb-shimmer absolute inset-0" />}
      <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/60 py-1.5 text-center text-[11px] font-bold backdrop-blur">🦸 Superheld · in 20 Sek.</span>
    </div>
  );
}

function Mission({ on }: { on: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 bg-[#0d0d0f] p-3">
      <img src="/visionbooth/stile/glamour.webp" alt="" className="h-[45%] w-full rounded-xl object-cover" />
      <div className="rounded-2xl p-3 text-center" style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--a) 38%, #141417), #141417 70%)" }}>
        <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-white/70">Mission erfüllt</p>
        <p className={`vb-display text-3xl font-bold ${on ? "vb-points" : ""}`} style={{ color: "var(--a)" }}>
          +30
        </p>
        <p className="text-[10px] text-white/80">💑 Selfie mit dem Brautpaar</p>
        <p className="mt-1 text-[11px] font-semibold">🥇 Platz 1 von 24</p>
      </div>
    </div>
  );
}

function Gallery({ on }: { on: boolean }) {
  const pics = ["glamour", "comic", "original", "vintage", "animation", "neon"];
  return (
    <div className="flex h-full flex-col bg-[#0d0d0f] p-2.5 pt-8">
      <p className="vb-display text-center text-sm font-semibold" style={{ color: "var(--a)" }}>
        Anna &amp; Max
      </p>
      <p className="text-center text-[8px] text-white/50">412 Fotos · von 87 Gästen</p>
      <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
        {pics.map((p, i) => (
          <img key={p} src={`/visionbooth/stile/${p}.webp`} alt="" className={`h-full w-full rounded-lg object-cover ${on ? "vb-in" : ""}`} style={{ animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
      <div className="vb-btn mt-2 rounded-full py-1.5 text-center text-[10px] font-bold">⬇︎ Alle Fotos (ZIP)</div>
    </div>
  );
}

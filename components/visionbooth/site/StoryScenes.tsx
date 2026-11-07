"use client";

import { useEffect, useRef, useState } from "react";

// „So läuft euer Abend“: fünf große Szenen. Sobald eine Szene im Bild ist, spielt im Handy eine
// kleine Animation in Dauerschleife (nur transform/opacity/clip-path → flüssig auch am Handy).
// Alle Bilder zeigen KI-generierte (fiktive) Personen.

const SCENES = [
  { time: "19:30", title: "QR-Code scannen", text: "Auf jedem Tisch steht euer Aufsteller. Handy-Kamera drauf – die VisionBooth öffnet sich sofort, ganz ohne App.", Screen: Scan },
  { time: "20:15", title: "3 – 2 – 1 – Foto!", text: "Countdown, Blitz, fertig: jedes Foto im Design eures Events – mit Namen, Datum und Logo.", Screen: Shoot },
  { time: "21:00", title: "Die KI-Verwandlung", text: "Ein Tipp auf „Superheld“ – und Sekunden später steht die ganze Gruppe im Kostüm über der Skyline. Erkennbar bleibt jeder.", Screen: Magic },
  { time: "22:30", title: "Missionen & Bestenliste", text: "„Selfie mit dem Brautpaar“ bringt +30 Punkte. Jeder sieht die Bestenliste auf dem Handy, auf Wunsch auch groß auf der Foto-Wand – plötzlich macht jeder mit.", Screen: Mission },
  { time: "Am Morgen danach", title: "Alle Fotos an einem Ort", text: "Kein Hinterherlaufen in WhatsApp-Gruppen: Die Fotos aller Gäste warten in eurer Galerie – mit einem Klick als ZIP.", Screen: Gallery },
];

export function StoryScenes() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-16">
      <h2 className="vb-display text-center text-3xl font-semibold sm:text-4xl">
        So läuft <span className="vb-gold-text">euer Abend</span>
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-white/65">Scroll mal durch – genau so erleben es eure Gäste.</p>
      <div className="mt-6">
        {SCENES.map((s, i) => (
          <Scene key={s.title} index={i} {...s} />
        ))}
      </div>
    </section>
  );
}

function Scene({ index, time, title, text, Screen }: (typeof SCENES)[number] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const flip = index % 2 === 1;

  return (
    <div ref={ref} className="vb-scene grid min-h-[86vh] items-center gap-8 py-10 md:grid-cols-2 md:gap-16" data-play={play}>
      <div className={`text-center md:text-left ${flip ? "md:order-last" : ""}`}>
        <p className={`vb-scene-text text-sm font-bold uppercase tracking-[0.3em]`} style={{ color: "var(--a)" }}>
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs" style={{ background: "var(--a)", color: "#0d0d0f" }}>
            {index + 1}
          </span>
          {time}
        </p>
        <h3 className="vb-scene-text vb-display mt-3 text-[2rem] font-semibold leading-tight sm:text-5xl" style={{ transitionDelay: "80ms" }}>
          {title}
        </h3>
        <p className="vb-scene-text mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/70 sm:text-[18px] md:mx-0" style={{ transitionDelay: "160ms" }}>
          {text}
        </p>
      </div>
      <div className="vb-scene-phone mx-auto w-[250px] sm:w-[290px]">
        <div className="relative rounded-[42px] border border-white/15 bg-[#0b0b0d] p-2.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]">
          <div className="absolute left-1/2 top-2.5 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          <div className="relative overflow-hidden rounded-[33px] bg-[#0a0a0c]" style={{ aspectRatio: "9 / 18" }}>
            <Screen />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Szenen im Handy (Animationen in booth.css, laufen nur bei data-play="true") ---------- */

function Scan() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,#3b2b18,#120d08)]">
      {/* Tischaufsteller im Kamerabild */}
      <div className="s1-card absolute left-1/2 top-[42%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#f5efe4] p-3 text-center text-[#2a2118] shadow-2xl">
        <p className="text-[8px] font-bold uppercase tracking-[0.3em] opacity-60">VisionBooth</p>
        <p className="vb-display mt-0.5 text-[15px] font-semibold">Anna &amp; Max</p>
        <div className="mx-auto mt-2 grid aspect-square w-[70%] grid-cols-7 gap-[2px] rounded bg-white p-1.5">
          {Array.from({ length: 49 }, (_, i) => (
            <span key={i} className={[0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44, 24, 26, 31, 33, 40, 46, 22, 38].includes(i) ? "bg-[#16181c]" : ""} />
          ))}
        </div>
        <p className="mt-1.5 text-[9px] font-semibold">Mach ein Foto! 📸</p>
      </div>
      {/* Sucher + Scan-Linie */}
      <div className="absolute left-[14%] right-[14%] top-[17%] h-[50%]">
        {["left-0 top-0 border-l-[3px] border-t-[3px]", "right-0 top-0 border-r-[3px] border-t-[3px]", "bottom-0 left-0 border-b-[3px] border-l-[3px]", "bottom-0 right-0 border-b-[3px] border-r-[3px]"].map((c) => (
          <span key={c} className={`s1-corner absolute h-7 w-7 rounded-md ${c}`} style={{ borderColor: "var(--a)" }} />
        ))}
        <span className="s1-line absolute inset-x-1 top-0 h-[3px] rounded-full" style={{ background: "var(--a)", boxShadow: "0 0 16px var(--a)" }} />
      </div>
      {/* Hinweis wie bei iOS */}
      <div className="s1-bubble absolute inset-x-3 top-9 z-10 flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[#16181c] shadow-xl backdrop-blur">
        <span className="text-base">🧭</span>
        <span className="text-[10px] leading-tight">
          <strong className="block">VisionBooth öffnen</strong>
          visionbooth.de/anna-max
        </span>
      </div>
      {/* App gleitet ins Bild */}
      <div className="s1-app absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0c] px-5 text-center">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 40% at 30% 20%, color-mix(in srgb, var(--a) 40%, transparent), transparent)" }} />
        <p className="relative text-[8px] font-semibold uppercase tracking-[0.35em] text-white/60">VisionBooth</p>
        <p className="vb-display vb-gold-text relative mt-2 text-3xl font-semibold">Anna &amp; Max</p>
        <p className="relative mt-2 text-[10px] text-white/60">Dein Foto mit Event-Rahmen</p>
        <div className="vb-btn relative mt-6 w-full rounded-full py-2.5 text-[12px] font-bold">📸 Los geht&apos;s</div>
      </div>
    </div>
  );
}

function Shoot() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#0d0d0f] px-3 pb-4 pt-10">
      <div className="relative flex-1 overflow-hidden rounded-2xl">
        <img src="/visionbooth/stile/original.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        {["3", "2", "1"].map((n, i) => (
          <span key={n} className="s2-num vb-display absolute inset-0 flex items-center justify-center text-[6rem] font-bold text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]" style={{ animationDelay: `${0.2 + i * 0.75}s` }}>
            {n}
          </span>
        ))}
        <span className="s2-flash absolute inset-0 bg-white" />
      </div>
      {/* fertiges Foto mit Rahmen */}
      <div className="s2-result absolute inset-x-3 bottom-4 top-10 flex flex-col rounded-2xl bg-[#0d0d0f] p-2 ring-2" style={{ ["--tw-ring-color" as string]: "var(--a)" }}>
        <img src="/visionbooth/stile/original.webp" alt="" className="min-h-0 flex-1 rounded-xl object-cover" />
        <p className="vb-display mt-2 text-center text-lg" style={{ color: "var(--a)" }}>
          Anna &amp; Max
        </p>
        <p className="text-center text-[8px] uppercase tracking-[0.3em] text-white/50">14.11.2026</p>
        <div className="vb-btn mt-2 rounded-full py-2 text-center text-[11px] font-bold">Speichern &amp; teilen</div>
      </div>
    </div>
  );
}

function Magic() {
  return (
    <div className="absolute inset-0 bg-[#0d0d0f]">
      <img src="/visionbooth/stile/original.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span className="s3-shimmer vb-shimmer absolute inset-0" />
      {/* Verwandlung wischt über das Foto */}
      <div className="s3-reveal absolute inset-0">
        <img src="/visionbooth/stile/superheld.webp" alt="" className="h-full w-full object-cover" />
      </div>
      <span className="s3-edge absolute bottom-0 top-0 w-1.5 rounded-full bg-white" style={{ boxShadow: "0 0 24px 8px var(--a), 0 0 6px #fff" }} />
      {["16% 22%", "70% 30%", "40% 55%", "80% 68%", "22% 74%"].map((p, i) => (
        <span key={p} className="s3-spark absolute text-xl" style={{ left: p.split(" ")[0], top: p.split(" ")[1], animationDelay: `${3 + i * 0.12}s` }}>
          ✨
        </span>
      ))}
      {/* Stil-Leiste mit Fingertipp */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-4 pt-10">
        <div className="flex gap-2">
          {[
            ["🎬", "Glamour"],
            ["🦸", "Superheld"],
            ["💥", "Comic"],
          ].map(([e, l]) => (
            <span key={l} className={`relative flex-1 rounded-xl px-1 py-2 text-center text-[10px] font-bold ${l === "Superheld" ? "s3-chip" : "bg-white/10"}`}>
              <span className="block text-lg">{e}</span>
              {l}
              {l === "Superheld" && <span className="s3-tap absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mission() {
  const rows = [
    { name: "Anna", pts: "90", me: true },
    { name: "Tom", pts: "70" },
    { name: "Lisa", pts: "60" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-[#0d0d0f] px-3 pb-4 pt-10">
      <div className="relative h-[42%] overflow-hidden rounded-2xl">
        <img src="/visionbooth/stile/glamour.webp" alt="" className="h-full w-full object-cover" />
        <span className="s4-badge absolute bottom-2 right-2 rounded-2xl px-3 py-1.5 text-center shadow-2xl" style={{ background: "var(--a)", color: "#0d0d0f" }}>
          <span className="vb-display block text-3xl font-bold leading-none">+30</span>
          <span className="block text-[8px] font-bold uppercase tracking-[0.2em]">Mission erfüllt</span>
        </span>
      </div>
      <p className="text-center text-[11px] text-white/70">💑 Selfie mit dem Brautpaar</p>
      <div className="rounded-2xl bg-white/5 p-2.5">
        <p className="mb-2 text-center text-[11px] font-semibold">🏆 Bestenliste</p>
        <div className="relative h-[96px]">
          {rows.map((r, i) => (
            <div
              key={r.name}
              className={`absolute inset-x-0 flex h-[28px] items-center gap-2 rounded-lg px-2 text-[11px] ${r.me ? "s4-me z-10" : `s4-other-${i}`}`}
              style={{ top: `${i * 32}px`, background: r.me ? "color-mix(in srgb, var(--a) 28%, #1a1a1d)" : "rgba(255,255,255,0.06)" }}
            >
              <span className="w-5 text-center">{r.me ? <span className="s4-medal">🥇</span> : ""}</span>
              <span className="flex-1 font-semibold">{r.name}</span>
              <span className="font-bold" style={{ color: "var(--a)" }}>
                {r.pts}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  const pics = ["glamour", "comic", "original", "vintage", "animation", "neon"];
  return (
    <div className="absolute inset-0 flex flex-col bg-[#0d0d0f] px-2.5 pb-4 pt-10">
      <p className="vb-display text-center text-lg font-semibold" style={{ color: "var(--a)" }}>
        Anna &amp; Max
      </p>
      <p className="text-center text-[9px] text-white/50">Eure Galerie · Fotos aller Gäste</p>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-1.5">
        {pics.map((p, i) => (
          <div key={p} className="s5-tile relative overflow-hidden rounded-lg" style={{ animationDelay: `${0.15 + i * 0.18}s` }}>
            <img src={`/visionbooth/stile/${p}.webp`} alt="" className="h-full w-full object-cover" />
            {i === 1 && <span className="s5-heart absolute bottom-1 right-1 text-base">❤️</span>}
          </div>
        ))}
      </div>
      <div className="relative mt-2 overflow-hidden rounded-full bg-white/10 py-2 text-center text-[11px] font-bold">
        <span className="s5-bar absolute inset-y-0 left-0" style={{ background: "var(--a)" }} />
        <span className="s5-label-a relative">⬇︎ Alle Fotos (ZIP)</span>
        <span className="s5-label-b absolute inset-0 flex items-center justify-center text-[#0d0d0f]">✓ Alle Fotos gespeichert</span>
      </div>
    </div>
  );
}

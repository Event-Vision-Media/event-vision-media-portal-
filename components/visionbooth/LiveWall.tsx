"use client";

import { VbLogo } from "@/components/visionbooth/VbLogo";
import { useEffect, useRef, useState } from "react";
import { onAccent } from "./frame";
import { pct, useRevealState } from "./RevealGame";
import type { RevealOption } from "./reveal";

interface Photo {
  id: string;
  kind: string;
  createdAt: string;
  url: string;
  thumb?: string | null;
  likes?: number;
  mission?: { emoji: string; text: string; points: number; by: string | null } | null;
}

interface Board {
  top: { name: string; points: number; missions: number }[];
  players: number;
  topPhoto: { id: string; url: string; likes: number } | null;
}

const BOARD_MS = 15000;
const MEDALS = ["🥇", "🥈", "🥉"];

const POLL_MS = 5000;
const ROTATE_MS = 6000;
/** So lange bleibt ein gerade aufgenommenes Foto groß stehen. */
const NEW_HOLD_MS = 10000;
const KEEP = 80;

function preload(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
}

/** Foto-Wand: zeigt neue Fotos sofort groß an und wechselt sonst durch die letzten Fotos. */
export function LiveWall({
  event,
  qrSvg,
  guestUrl,
}: {
  event: { slug: string; frameText: string; accent: string; logoUrl: string | null; challenges: unknown[]; reveal: { question: string; options: [RevealOption, RevealOption] } | null };
  qrSvg: string;
  guestUrl: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [current, setCurrent] = useState<Photo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const holdUntil = useRef(0);
  const rotateIdx = useRef(0);
  const photosRef = useRef<Photo[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const missions = event.challenges.length > 0;
  const [reveal] = useRevealState(event.slug, Boolean(event.reveal));
  const [bigReveal, setBigReveal] = useState(false);
  const lastResult = useRef<string | null | undefined>(undefined);
  // Auflösung: 30 Sekunden groß über die ganze Wand (nur wenn sie live passiert)
  useEffect(() => {
    if (!reveal) return;
    if (lastResult.current === null && reveal.result) {
      setBigReveal(true);
      const t = setTimeout(() => setBigReveal(false), 30000);
      lastResult.current = reveal.result;
      return () => clearTimeout(t);
    }
    lastResult.current = reveal.result;
  }, [reveal]);

  // Bestenliste regelmäßig aktualisieren
  useEffect(() => {
    if (!missions) return;
    let stop = false;
    const load = () =>
      fetch(`/api/vb/${event.slug}/board?limit=5`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => !stop && b && setBoard(b))
        .catch(() => {});
    load();
    const t = setInterval(load, BOARD_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [missions, event.slug]);

  // Nachladen: erst alle der letzten Fotos, danach nur neue
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let round = 0;
    async function poll() {
      round += 1;
      // Jede Minute komplett abgleichen, damit im Admin ausgeblendete Fotos verschwinden
      if (round % 12 === 0) {
        try {
          const res = await fetch(`/api/vb/${event.slug}/photos?limit=${KEEP}`, { cache: "no-store" });
          if (res.ok) {
            const { photos: all } = (await res.json()) as { photos: Photo[] };
            const ids = new Set(all.map((p) => p.id));
            photosRef.current = photosRef.current.filter((p) => ids.has(p.id));
            setPhotos(photosRef.current);
            setCurrent((c) => (c && ids.has(c.id) ? c : photosRef.current[0] ?? null));
          }
        } catch {
          /* nächste Runde */
        }
      }
      try {
        const newest = photosRef.current[0]?.createdAt;
        const res = await fetch(`/api/vb/${event.slug}/photos?limit=${newest ? 20 : 40}${newest ? `&after=${encodeURIComponent(newest)}` : ""}`, { cache: "no-store" });
        if (res.ok) {
          const { photos: fresh } = (await res.json()) as { photos: Photo[] };
          if (fresh.length && !stop) {
            const first = photosRef.current.length === 0;
            await preload(fresh[0].url);
            photosRef.current = [...fresh, ...photosRef.current.filter((p) => !fresh.some((f) => f.id === p.id))].slice(0, KEEP);
            setPhotos(photosRef.current);
            setCurrent(fresh[0]);
            if (!first) {
              setIsNew(true);
              holdUntil.current = Date.now() + NEW_HOLD_MS;
            }
            rotateIdx.current = 0;
          }
        }
      } catch {
        /* Netz kurz weg – nächster Versuch */
      }
      if (!stop) timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [event.slug]);

  // Durchwechseln, solange kein neues Foto „festgehalten“ wird
  useEffect(() => {
    const t = setInterval(async () => {
      const list = photosRef.current;
      if (Date.now() < holdUntil.current || list.length < 2) return;
      setIsNew(false);
      rotateIdx.current = (rotateIdx.current + 1) % Math.min(list.length, 30);
      const next = list[rotateIdx.current];
      await preload(next.url);
      setCurrent(next);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const gold = event.accent;
  const strip = photos.slice(0, 6);
  const ink = onAccent(gold);

  return (
    <main className="vb flex h-screen w-screen gap-[1.6vw] overflow-hidden p-[1.6vw]" style={{ ["--a" as string]: gold, ["--ink" as string]: ink, minHeight: 0 }}>
      <div className="vb-aurora" aria-hidden />

      <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2vw]">
        {current && <img key={`bg${current.id}`} src={current.thumb || current.url} alt="" aria-hidden className="vb-wall-bg absolute inset-0 h-full w-full scale-125 object-cover blur-3xl" />}
        <span className="absolute left-[1.2vw] top-[1.2vw] z-10 flex items-center gap-[0.5vw] rounded-full bg-black/45 px-[1vw] py-[0.4vw] text-[0.95vw] font-semibold backdrop-blur">
          <span className="vb-live h-[0.7vw] w-[0.7vw] rounded-full bg-red-500" /> LIVE · {photos.length === 1 ? "1 Foto" : `${photos.length} Fotos`}
        </span>
        {current ? (
          <>
            <img key={current.id} src={current.url} alt="" className="vb-wall-in relative max-h-[92%] max-w-[92%] rounded-[1.2vw] object-contain shadow-[0_3vw_6vw_-1.5vw_rgba(0,0,0,0.9)] ring-1 ring-white/15" />
            {isNew && !current.mission && (
              <div className="absolute inset-x-0 top-[5%] z-10 flex justify-center">
                <span className="vb-pop rounded-full px-[1.6vw] py-[0.6vw] text-[1.4vw] font-bold shadow-xl" style={{ background: gold, color: ink }}>
                  Gerade aufgenommen ✨
                </span>
              </div>
            )}
            {current.mission && (
              <div key={`m${current.id}`} className="vb-wall-mission absolute bottom-[3%] left-1/2 z-10 flex -translate-x-1/2 items-center gap-[1vw] whitespace-nowrap rounded-full bg-black/75 py-[0.7vw] pl-[0.8vw] pr-[1.6vw] text-[1.35vw] shadow-2xl ring-1 ring-white/15 backdrop-blur">
                <span className="flex h-[3vw] w-[3vw] items-center justify-center rounded-full text-[1.7vw]" style={{ background: gold }}>
                  {current.mission.emoji}
                </span>
                <span>
                  <span className="font-semibold">{current.mission.by ?? "Ein Gast"}</span>
                  <span className="text-white/65"> hat „{current.mission.text}“ erfüllt</span>
                </span>
                <span className="font-bold" style={{ color: gold }}>+{current.mission.points}</span>
              </div>
            )}
            {!isNew && photos.length > 1 && (
              <span key={`p${current.id}`} className="vb-wall-progress absolute bottom-0 left-0 h-[0.35vw] rounded-full" style={{ background: gold, ["--dur" as string]: `${ROTATE_MS}ms` }} />
            )}
          </>
        ) : (
          <div className="relative text-center">
            <p className="vb-display vb-gold-text text-[3.4vw] font-semibold">Gleich geht&apos;s los!</p>
            <p className="mt-[0.8vw] text-[1.4vw] text-white/60">Scannt den QR-Code – eure Fotos erscheinen hier.</p>
          </div>
        )}
      </section>

      <aside className="vb-glass relative flex w-[24vw] flex-col items-center justify-between rounded-[2vw] px-[1.4vw] py-[1.6vw] text-center">
        <div>
          {event.logoUrl && <img src={event.logoUrl} alt="" className="mx-auto mb-[1.2vw] max-h-[6vw] max-w-[80%] object-contain" />}
          <p className="vb-display vb-gold-text text-[2.4vw] font-semibold leading-tight">{event.frameText}</p>
        </div>

        {reveal && event.reveal && (
          <div className="w-full">
            {reveal.result ? (
              <p className="rounded-[1vw] px-[1vw] py-[0.8vw] text-[1.3vw] font-bold" style={{ background: event.reveal.options.find((o) => o.id === reveal.result)!.color }}>
                {event.reveal.options.find((o) => o.id === reveal.result)!.emoji} Es wird ein {event.reveal.options.find((o) => o.id === reveal.result)!.label}!
              </p>
            ) : (
              <>
                <p className="text-[1vw] font-semibold text-white/80">🔮 {event.reveal.question}</p>
                <div className="mt-[0.5vw] flex h-[2.2vw] overflow-hidden rounded-full text-[0.95vw] font-bold">
                  <span className="flex items-center justify-start pl-[0.7vw] transition-[width] duration-1000" style={{ width: `${Math.max(12, Math.min(88, pct(reveal)))}%`, background: event.reveal.options[0].color }}>
                    {event.reveal.options[0].emoji} {pct(reveal)}%
                  </span>
                  <span className="flex flex-1 items-center justify-end pr-[0.7vw]" style={{ background: event.reveal.options[1].color }}>
                    {100 - pct(reveal)}% {event.reveal.options[1].emoji}
                  </span>
                </div>
                <p className="mt-[0.3vw] text-[0.8vw] text-white/50">{reveal.counts.a + reveal.counts.b === 1 ? "1 Tipp" : `${reveal.counts.a + reveal.counts.b} Tipps`} · Auflösung folgt …</p>
              </>
            )}
          </div>
        )}

        <div className="w-full">
          <p className="vb-display text-[1.9vw] font-semibold">Mach mit! 📸</p>
          <p className="mt-[0.3vw] text-[0.95vw] text-white/60">QR-Code scannen, Foto machen – es erscheint hier.</p>
          <div className="vb-wall-qr mx-auto mt-[1vw] w-[14vw] rounded-[1vw] bg-white p-[0.6vw]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="mt-[0.6vw] text-[0.85vw] text-white/40">{guestUrl}</p>
        </div>

        {missions && board ? (
          <div className="w-full text-left">
            <p className="vb-display mb-[0.6vw] text-center text-[1.5vw] font-semibold">🏆 Bestenliste</p>
            {board.top.length === 0 ? (
              <p className="text-center text-[0.95vw] text-white/50">Erfülle Foto-Missionen und lande hier!</p>
            ) : (
              <ol className="space-y-[0.35vw]">
                {board.top.map((r, i) => (
                  <li key={r.name + i} className="flex items-center gap-[0.6vw] rounded-lg bg-white/[0.06] px-[0.7vw] py-[0.45vw] text-[1vw]">
                    <span className="w-[1.8vw] text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
                    <span className="flex-1 truncate font-semibold">{r.name}</span>
                    <span className="font-bold" style={{ color: gold }}>{r.points}</span>
                  </li>
                ))}
              </ol>
            )}
            {board.topPhoto && (
              <div className="mt-[0.8vw] flex items-center gap-[0.7vw] rounded-lg bg-white/[0.06] p-[0.45vw]">
                <img src={board.topPhoto.url} alt="" className="h-[4.2vw] w-[3.4vw] rounded object-cover" />
                <span className="text-[0.9vw] leading-tight text-white/75">
                  <span className="block font-semibold text-white">❤️ Foto des Abends</span>
                  {board.topPhoto.likes === 1 ? "1 Herz" : `${board.topPhoto.likes} Herzen`}
                </span>
              </div>
            )}
          </div>
        ) : strip.length > 1 ? (
          <div className="grid w-full grid-cols-3 gap-[0.5vw]">
            {strip.map((p) => (
              <img key={p.id} src={p.thumb || p.url} alt="" className={`aspect-[4/5] w-full rounded object-cover ${p.id === current?.id ? "ring-2" : "opacity-60"}`} style={{ ["--tw-ring-color" as string]: gold }} />
            ))}
          </div>
        ) : (
          <div />
        )}
        <VbLogo height="1.7vw" style={{ opacity: 0.45 }} />
      </aside>

      {bigReveal && reveal?.result && event.reveal && (() => {
        const w = event.reveal.options.find((o) => o.id === reveal.result)!;
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center" style={{ background: `radial-gradient(circle at 50% 40%, ${w.color}, #0a0a0c 80%)` }}>
            <p className="vb-in text-[1.6vw] font-semibold uppercase tracking-[0.4em] text-white/85">Die Auflösung</p>
            <p className="vb-points mt-[1vw] text-[12vw] leading-none">{w.emoji}</p>
            <p className="vb-display vb-in mt-[1vw] text-[6vw] font-semibold" style={{ animationDelay: "600ms" }}>Es wird ein {w.label}!</p>
            {reveal.winners && reveal.winners.length > 0 && (
              <p className="vb-in mt-[1.5vw] max-w-[70vw] text-[1.6vw] text-white/85" style={{ animationDelay: "1200ms" }}>
                🎉 Richtig getippt: {reveal.winners.slice(0, 12).join(", ")}{reveal.winners.length > 12 ? ` und ${reveal.winners.length - 12} weitere` : ""}
              </p>
            )}
            <WallConfetti color={w.color} />
          </div>
        );
      })()}
    </main>
  );
}

/** Konfetti in der Ergebnis-Farbe für die Auflösung auf der Wand */
function WallConfetti({ color }: { color: string }) {
  const colors = [color, "#ffffff", color, "#ffe9a8"];
  return (
    <div className="vb-confetti" aria-hidden>
      {Array.from({ length: 90 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            width: 14,
            height: 22,
            ["--x" as string]: `${((i * 53) % 60) - 30}vw`,
            ["--r" as string]: `${360 + ((i * 97) % 540)}deg`,
            ["--d" as string]: `${2.6 + ((i * 13) % 20) / 10}s`,
            ["--delay" as string]: `${((i * 7) % 30) / 10}s`,
          }}
        />
      ))}
    </div>
  );
}

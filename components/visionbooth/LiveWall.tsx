"use client";

import { useEffect, useRef, useState } from "react";

interface Photo {
  id: string;
  kind: string;
  createdAt: string;
  url: string;
}

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
  event: { slug: string; frameText: string; accent: string; logoUrl: string | null };
  qrSvg: string;
  guestUrl: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [current, setCurrent] = useState<Photo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const holdUntil = useRef(0);
  const rotateIdx = useRef(0);
  const photosRef = useRef<Photo[]>([]);

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

  return (
    <main className="flex h-screen w-screen gap-[2vw] overflow-hidden bg-[#0d0d0f] p-[2vw] text-white">
      <section className="relative flex flex-1 items-center justify-center">
        {current ? (
          <>
            <img key={current.id} src={current.url} alt="" className="max-h-full max-w-full animate-fade-in rounded-lg object-contain shadow-2xl" />
            {isNew && (
              <span className="absolute left-4 top-4 animate-fade-in rounded-full px-5 py-2 text-[1.4vw] font-semibold text-[#0d0d0f]" style={{ background: gold }}>
                Gerade aufgenommen ✨
              </span>
            )}
          </>
        ) : (
          <p className="text-center font-serif text-[2.4vw] text-white/60">Die ersten Fotos erscheinen gleich hier …</p>
        )}
      </section>

      <aside className="flex w-[24vw] flex-col items-center justify-between py-[1vw] text-center">
        <div>
          {event.logoUrl && <img src={event.logoUrl} alt="" className="mx-auto mb-[1.5vw] max-h-[7vw] max-w-[80%] object-contain" />}
          <p className="font-serif text-[2.4vw] leading-tight" style={{ color: gold }}>
            {event.frameText}
          </p>
        </div>

        <div className="w-full">
          <p className="font-serif text-[2vw]">Mach mit! 📸</p>
          <p className="mt-[0.4vw] text-[1vw] text-white/60">QR-Code scannen, Foto machen – es erscheint hier.</p>
          <div className="mx-auto mt-[1vw] w-[15vw] rounded-xl bg-white p-[0.6vw]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="mt-[0.6vw] text-[0.9vw] text-white/40">{guestUrl}</p>
        </div>

        {strip.length > 1 ? (
          <div className="grid w-full grid-cols-3 gap-[0.5vw]">
            {strip.map((p) => (
              <img key={p.id} src={p.url} alt="" className={`aspect-[4/5] w-full rounded object-cover ${p.id === current?.id ? "ring-2" : "opacity-60"}`} style={{ ["--tw-ring-color" as string]: gold }} />
            ))}
          </div>
        ) : (
          <div />
        )}
        <p className="text-[0.8vw] tracking-[0.3em] text-white/30">VISIONBOOTH</p>
      </aside>
    </main>
  );
}

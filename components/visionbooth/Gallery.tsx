"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAccent } from "./frame";

interface Photo {
  id: string;
  kind: string;
  createdAt: string;
  url: string;
  likes?: number;
}

const PAGE = 60;

function guestKey(): string {
  try {
    let k = localStorage.getItem("vb-guest");
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem("vb-guest", k);
    }
    return k;
  } catch {
    return "";
  }
}

function Heart({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={on ? "#ff4d6d" : "none"}
        stroke={on ? "#ff4d6d" : "currentColor"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fileName = (p: Photo, i: number) =>
  `visionbooth-${String(i + 1).padStart(3, "0")}${p.kind === "ki" ? "-ki" : ""}.jpg`;

/** Galerie: Raster mit Nachladen, Großansicht mit Wischen/Pfeiltasten, Download einzeln oder als ZIP. */
export function Gallery({ event, total }: { event: { slug: string; frameText: string; accent: string; logoUrl: string | null }; total: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"alle" | "ki" | "top">("alle");
  const [topList, setTopList] = useState<Photo[] | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [burst, setBurst] = useState<string | null>(null);
  const lastTap = useRef(0);
  const [open, setOpen] = useState<number | null>(null);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const last = photos[photos.length - 1]?.createdAt;
      const res = await fetch(`/api/vb/${event.slug}/photos?limit=${PAGE}${last ? `&before=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" });
      const { photos: next = [] } = res.ok ? ((await res.json()) as { photos: Photo[] }) : { photos: [] };
      setPhotos((p) => [...p, ...next.filter((n) => !p.some((x) => x.id === n.id))]);
      if (next.length < PAGE) setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, photos, event.slug]);

  // Nachladen, sobald das Ende des Rasters sichtbar wird
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // Eigene Herzen merken (nur auf diesem Gerät)
  const likedKey = `vb-likes-${event.slug}`;
  useEffect(() => {
    try {
      setLiked(new Set(JSON.parse(localStorage.getItem(likedKey) ?? "[]")));
    } catch {
      /* privates Surfen */
    }
  }, [likedKey]);

  // Beliebteste Fotos erst laden, wenn der Filter gewählt wird
  useEffect(() => {
    if (filter !== "top" || topList) return;
    fetch(`/api/vb/${event.slug}/photos?sort=top&limit=100`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d: { photos: Photo[] }) => setTopList(d.photos))
      .catch(() => setTopList([]));
  }, [filter, topList, event.slug]);

  const likeCount = (p: Photo) => likes[p.id] ?? p.likes ?? 0;

  async function toggleLike(p: Photo, force?: boolean) {
    const on = force ?? !liked.has(p.id);
    if (on === liked.has(p.id)) return;
    const next = new Set(liked);
    if (on) next.add(p.id);
    else next.delete(p.id);
    setLiked(next);
    setLikes((l) => ({ ...l, [p.id]: Math.max(0, likeCount(p) + (on ? 1 : -1)) }));
    if (on) {
      setBurst(p.id);
      setTimeout(() => setBurst((b) => (b === p.id ? null : b)), 800);
      try {
        navigator.vibrate?.(18);
      } catch {
        /* iPhone */
      }
    }
    try {
      localStorage.setItem(likedKey, JSON.stringify([...next].slice(-500)));
    } catch {
      /* privates Surfen */
    }
    const res = await fetch(`/api/vb/${event.slug}/like`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vb-guest": guestKey() },
      body: JSON.stringify({ photoId: p.id, on }),
    }).catch(() => null);
    if (res?.ok) {
      const { likes: n } = await res.json();
      setLikes((l) => ({ ...l, [p.id]: n }));
    }
  }

  const shown = filter === "ki" ? photos.filter((p) => p.kind === "ki") : filter === "top" ? topList ?? [] : photos;
  const hasAi = photos.some((p) => p.kind === "ki");

  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : Math.min(shown.length - 1, Math.max(0, i + d)))),
    [shown.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  async function download(p: Photo, i: number) {
    // Über Blob, damit auch iOS/Android speichern statt nur zu öffnen
    try {
      const blob = await (await fetch(p.url)).blob();
      const file = new File([blob], fileName(p, i), { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => {});
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      window.open(p.url, "_blank");
    }
  }

  /** Alle Fotos als ZIP – im Browser gepackt (große Mengen besser am Computer). */
  async function downloadAll() {
    if (zip) return;
    setZipError(null);
    try {
      // erst alle Fotos laden (nicht nur die sichtbare Seite)
      let all = [...photos];
      let last = all[all.length - 1]?.createdAt;
      while (!done) {
        const res = await fetch(`/api/vb/${event.slug}/photos?limit=100${last ? `&before=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" });
        const { photos: next = [] } = res.ok ? ((await res.json()) as { photos: Photo[] }) : { photos: [] };
        all = [...all, ...next.filter((n) => !all.some((x) => x.id === n.id))];
        last = next[next.length - 1]?.createdAt;
        if (next.length < 100) break;
      }
      setPhotos(all);
      setDone(true);
      const list = filter === "ki" ? all.filter((p) => p.kind === "ki") : all;

      const { default: JSZip } = await import("jszip");
      const z = new JSZip();
      setZip({ done: 0, total: list.length });
      let n = 0;
      const queue = list.map((p, i) => ({ p, i }));
      const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const blob = await (await fetch(job.p.url)).blob();
          z.file(fileName(job.p, list.length - 1 - job.i), blob);
          setZip({ done: ++n, total: list.length });
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      const out = await z.generateAsync({ type: "blob", compression: "STORE" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = `${event.frameText.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "visionbooth"}-fotos.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch {
      setZipError("Das ZIP konnte nicht erstellt werden. Am Computer klappt es meist besser – oder lade die Fotos einzeln.");
    } finally {
      setZip(null);
    }
  }

  const gold = event.accent;
  const current = open !== null ? shown[open] : null;

  return (
    <main className="min-h-[100dvh] bg-[#0d0d0f] text-white">
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 text-center">
        {event.logoUrl && <img src={event.logoUrl} alt="" className="mx-auto mb-5 max-h-16 max-w-[50%] object-contain" />}
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">VisionBooth · Galerie</p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl" style={{ color: gold }}>
          {event.frameText}
        </h1>
        <p className="mt-2 text-sm text-white/60">{total === 1 ? "1 Foto" : `${total} Fotos`}</p>

        {total > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <div className="flex rounded-full bg-white/10 p-1 text-sm">
              {(hasAi ? (["alle", "top", "ki"] as const) : (["alle", "top"] as const)).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setOpen(null);
                  }}
                  className={`rounded-full px-4 py-1.5 transition ${filter === f ? "bg-white text-[#0d0d0f]" : "text-white/70"}`}
                >
                  {f === "alle" ? "Neueste" : f === "top" ? "❤️ Beliebt" : "✨ KI"}
                </button>
              ))}
            </div>
            <button onClick={downloadAll} disabled={Boolean(zip)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60">
              {zip ? `ZIP wird erstellt … ${zip.done}/${zip.total}` : "Alle herunterladen (ZIP)"}
            </button>
          </div>
        )}
        {zipError && <p className="mx-auto mt-3 max-w-sm text-xs text-red-300">{zipError}</p>}
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-1.5 px-1.5 pb-16 sm:grid-cols-3 sm:gap-2 sm:px-4 lg:grid-cols-4">
        {shown.map((p, i) => (
          <div key={p.id} className="relative overflow-hidden rounded-md bg-white/5">
            <button onClick={() => setOpen(i)} className="block w-full">
              <img src={p.url} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition hover:scale-[1.02]" />
            </button>
            {p.kind === "ki" && <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px]">✨ KI</span>}
            {filter === "top" && i < 3 && <span className="pointer-events-none absolute right-1.5 top-1.5 text-xl drop-shadow">{["🥇", "🥈", "🥉"][i]}</span>}
            <button
              onClick={() => toggleLike(p)}
              className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold backdrop-blur"
              aria-label={liked.has(p.id) ? "Herz entfernen" : "Herz geben"}
            >
              <Heart on={liked.has(p.id)} className={`h-4 w-4 ${burst === p.id ? "vb-heart" : ""}`} />
              {likeCount(p) > 0 && likeCount(p)}
            </button>
          </div>
        ))}
      </section>
      <div ref={sentinel} className="pb-10 text-center text-xs text-white/40">
        {filter === "top"
          ? topList === null
            ? "Lädt …"
            : topList.length === 0
              ? "Noch keine Herzen vergeben – tippe auf ♡ bei deinen Lieblingsfotos."
              : ""
          : loading
            ? "Lädt …"
            : done && photos.length === 0
              ? "Noch keine Fotos in der Galerie."
              : ""}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70">
            <span>
              {open! + 1} / {shown.length}
            </span>
            <button onClick={() => setOpen(null)} className="h-10 w-10 rounded-full bg-white/10 text-lg" aria-label="Schließen">
              ✕
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            <img
              src={current.url}
              alt=""
              className="max-h-full max-w-full select-none rounded object-contain"
              onClick={() => {
                // Doppeltippen = Herz
                const now = Date.now();
                if (now - lastTap.current < 300) toggleLike(current, true);
                lastTap.current = now;
              }}
            />
            {burst === current.id && (
              <Heart on className="vb-heart-burst pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_30px_rgba(255,77,109,0.6)]" />
            )}
            {open! > 0 && (
              <button onClick={() => step(-1)} className="absolute left-2 z-10 hidden h-12 w-12 rounded-full bg-black/60 text-2xl text-white ring-1 ring-white/20 sm:block" aria-label="Zurück">
                ‹
              </button>
            )}
            {open! < shown.length - 1 && (
              <button onClick={() => step(1)} className="absolute right-2 z-10 hidden h-12 w-12 rounded-full bg-black/60 text-2xl text-white ring-1 ring-white/20 sm:block" aria-label="Weiter">
                ›
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button
              onClick={() => toggleLike(current)}
              className="flex h-[52px] min-w-[52px] items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold"
              aria-label={liked.has(current.id) ? "Herz entfernen" : "Herz geben"}
            >
              <Heart on={liked.has(current.id)} className={`h-6 w-6 ${burst === current.id ? "vb-heart" : ""}`} />
              {likeCount(current) > 0 && likeCount(current)}
            </button>
            <button onClick={() => download(current, Math.max(0, photos.length - 1 - photos.indexOf(current)))} className="w-full max-w-xs rounded-full py-3.5 font-semibold" style={{ background: gold, color: onAccent(gold) }}>
              Foto speichern
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

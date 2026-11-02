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
  const ink = onAccent(gold);
  const current = open !== null ? shown[open] : null;
  const hero = filter === "alle" && shown.length > 2;
  const filters = hasAi ? (["alle", "top", "ki"] as const) : (["alle", "top"] as const);

  return (
    <main className="vb" style={{ ["--a" as string]: gold, ["--ink" as string]: ink }}>
      <div className="vb-aurora" aria-hidden />

      <header className="relative mx-auto max-w-6xl px-5 pb-5 pt-10 text-center">
        {event.logoUrl ? (
          <img src={event.logoUrl} alt="" className="vb-in mx-auto mb-5 max-h-16 max-w-[50%] object-contain" />
        ) : (
          <span className="vb-in vb-glass inline-block rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/75">Galerie</span>
        )}
        <h1 className="vb-in vb-display vb-gold-text mt-4 text-[2.4rem] font-semibold leading-[1.08] sm:text-5xl" style={{ animationDelay: "80ms" }}>
          {event.frameText}
        </h1>
        <p className="vb-in mt-3 text-sm text-white/60" style={{ animationDelay: "140ms" }}>
          {total === 1 ? "1 Foto" : `${total} Fotos`} · tippe ♡ bei deinen Lieblingen
        </p>
        <a href={`/vb/${event.slug}`} className="vb-in vb-glass mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white/90" style={{ animationDelay: "200ms" }}>
          📸 Selbst ein Foto machen
        </a>
      </header>

      {total > 0 && (
        <div className="sticky top-0 z-30 px-3 py-2" style={{ background: "linear-gradient(#0a0a0c 55%, transparent)" }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
            <div className="vb-glass flex rounded-full p-1 text-[13px] font-semibold">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setOpen(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 transition ${filter === f ? "" : "text-white/70"}`}
                  style={filter === f ? { background: gold, color: ink } : undefined}
                >
                  {f === "alle" ? "Neueste" : f === "top" ? "❤️ Beliebt" : "✨ KI"}
                </button>
              ))}
            </div>
            <button onClick={downloadAll} disabled={Boolean(zip)} className="vb-glass flex-none rounded-full px-3.5 py-2 text-[13px] font-semibold text-white/90 disabled:opacity-60" aria-label="Alle Fotos als ZIP herunterladen">
              {zip ? `${zip.done}/${zip.total} …` : "⬇︎ Alle (ZIP)"}
            </button>
          </div>
          {zipError && <p className="mx-auto mt-2 max-w-sm text-center text-xs text-red-300">{zipError}</p>}
        </div>
      )}

      <section className="relative mx-auto grid max-w-6xl grid-cols-2 gap-2 px-2 pb-16 pt-2 sm:grid-cols-3 sm:gap-3 sm:px-4 lg:grid-cols-4">
        {shown.map((p, i) => (
          <div
            key={p.id}
            className={`vb-in group relative overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 ${hero && i === 0 ? "col-span-2 row-span-2" : ""}`}
            style={{ animationDelay: `${(i % 12) * 35}ms` }}
          >
            <button onClick={() => setOpen(i)} className="block h-full w-full">
              <img src={p.url} alt="" loading="lazy" className="aspect-[4/5] h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            </button>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            {hero && i === 0 && <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: gold, color: ink }}>Neuestes Foto</span>}
            {p.kind === "ki" && <span className={`pointer-events-none absolute ${hero && i === 0 ? "left-2.5 top-10" : "left-2 top-2"} rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold backdrop-blur`}>✨ KI</span>}
            {filter === "top" && i < 3 && <span className="pointer-events-none absolute right-2 top-2 text-2xl drop-shadow">{["🥇", "🥈", "🥉"][i]}</span>}
            <button
              onClick={() => toggleLike(p)}
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1.5 text-[12px] font-semibold backdrop-blur transition active:scale-90"
              aria-label={liked.has(p.id) ? "Herz entfernen" : "Herz geben"}
            >
              <Heart on={liked.has(p.id)} className={`h-4 w-4 ${burst === p.id ? "vb-heart" : ""}`} />
              {likeCount(p) > 0 && likeCount(p)}
            </button>
          </div>
        ))}
      </section>

      <div ref={sentinel} className="relative px-5 pb-12 text-center text-sm text-white/50">
        {filter === "top" ? (
          topList === null ? (
            "Lädt …"
          ) : topList.length === 0 ? (
            <Empty icon="❤️" title="Noch keine Herzen" text="Tippe auf ♡ bei deinen Lieblingsfotos – die beliebtesten erscheinen hier." />
          ) : null
        ) : loading ? (
          "Lädt …"
        ) : done && photos.length === 0 ? (
          <Empty icon="📸" title="Noch keine Fotos" text="Sei die oder der Erste – die Fotos aller Gäste erscheinen hier." cta={{ href: `/vb/${event.slug}`, label: "Erstes Foto machen" }} />
        ) : null}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <img src={current.url} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl" />
          <div className="relative flex items-center justify-between px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
            <span className="vb-glass rounded-full px-3 py-1.5 text-xs font-semibold text-white/80">
              {open! + 1} / {shown.length}
            </span>
            <button onClick={() => setOpen(null)} className="vb-glass h-11 w-11 rounded-full text-lg" aria-label="Schließen">
              ✕
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
            <img
              key={current.id}
              src={current.url}
              alt=""
              className="vb-pop max-h-full max-w-full select-none rounded-2xl object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
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
              <button onClick={() => step(-1)} className="vb-glass absolute left-3 z-10 hidden h-12 w-12 rounded-full text-2xl sm:block" aria-label="Zurück">
                ‹
              </button>
            )}
            {open! < shown.length - 1 && (
              <button onClick={() => step(1)} className="vb-glass absolute right-3 z-10 hidden h-12 w-12 rounded-full text-2xl sm:block" aria-label="Weiter">
                ›
              </button>
            )}
          </div>
          <div className="relative flex items-center justify-center gap-3 px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button
              onClick={() => toggleLike(current)}
              className="vb-glass flex h-[54px] min-w-[54px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-90"
              aria-label={liked.has(current.id) ? "Herz entfernen" : "Herz geben"}
            >
              <Heart on={liked.has(current.id)} className={`h-6 w-6 ${burst === current.id ? "vb-heart" : ""}`} />
              {likeCount(current) > 0 && likeCount(current)}
            </button>
            <button onClick={() => download(current, Math.max(0, photos.length - 1 - photos.indexOf(current)))} className="vb-btn w-full max-w-xs rounded-full py-4 text-[16px] font-bold">
              Foto speichern
            </button>
          </div>
          <p className="relative pb-3 text-center text-[11px] text-white/40">Doppeltippen = ❤️ · wischen = nächstes Foto</p>
        </div>
      )}
    </main>
  );
}

function Empty({ icon, title, text, cta }: { icon: string; title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="vb-in vb-glass mx-auto mt-4 max-w-sm rounded-3xl px-6 py-8">
      <p className="text-4xl">{icon}</p>
      <p className="vb-display mt-3 text-xl font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/60">{text}</p>
      {cta && (
        <a href={cta.href} className="vb-btn mt-5 inline-block rounded-full px-6 py-3 text-sm font-bold">
          {cta.label}
        </a>
      )}
    </div>
  );
}

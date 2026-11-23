"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDuration, type GalleryItemView } from "@/lib/event-gallery";

/** Kacheln mit Vorschaubild; Tippen öffnet den Player mit Herunterladen/Teilen; „Alle herunterladen“ am Computer. */
export function GalleryGrid({ items, title }: { items: GalleryItemView[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState<{ done: number; total: number } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [touch, setTouch] = useState(true);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && Boolean(navigator.share));
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const go = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length)), [items.length]);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go]);

  async function downloadAll() {
    // Nacheinander, damit der Browser nicht blockiert (fragt ggf. einmal nach Erlaubnis für mehrere Downloads)
    setAll({ done: 0, total: items.length });
    for (let i = 0; i < items.length; i++) {
      const a = document.createElement("a");
      a.href = items[i].download;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setAll({ done: i + 1, total: items.length });
      await new Promise((r) => setTimeout(r, 900));
    }
    setTimeout(() => setAll(null), 4000);
  }

  async function share() {
    try {
      await navigator.share({ title, text: "Schau dir die 360°-Videos an 🎬", url: location.href });
    } catch {
      /* abgebrochen */
    }
  }

  const cur = open === null ? null : items[open];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {canShare && (
          <button type="button" onClick={share} className="rounded-full bg-anthracite-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-anthracite-700">
            Galerie teilen
          </button>
        )}
        {!touch && items.length > 1 && (
          <button type="button" onClick={downloadAll} disabled={Boolean(all)} className="rounded-full border border-anthracite-200 bg-white px-5 py-2.5 text-sm font-semibold text-anthracite-700 hover:border-gold-300 disabled:opacity-60">
            {all ? `Lädt herunter … ${all.done} von ${all.total}` : `Alle ${items.length} Videos herunterladen`}
          </button>
        )}
      </div>
      {all && <p className="mt-2 text-center text-xs text-anthracite-400">Dein Browser fragt evtl. einmal, ob mehrere Downloads erlaubt sind – bitte „Zulassen“.</p>}
      {touch && items.length > 1 && <p className="mt-2 text-center text-xs text-anthracite-400">Tipp: Am Computer kannst du alle Videos auf einmal herunterladen.</p>}

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-anthracite-900 shadow-card outline-none ring-gold-400 focus-visible:ring-2"
            aria-label={`Video ${i + 1} abspielen`}
          >
            {it.thumb ? (
              <img src={it.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl">🎬</span>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-anthracite-900 shadow-lg transition group-hover:scale-110">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
            {it.duration != null && <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">{formatDuration(it.duration)}</span>}
          </button>
        ))}
      </div>

      {cur && open !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`Video ${open + 1} von ${items.length}`}>
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
            <span className="text-sm text-white/70">{open + 1} / {items.length}</span>
            <button type="button" onClick={() => setOpen(null)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">Schließen ✕</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            <video key={cur.id} src={cur.src} poster={cur.thumb ?? undefined} controls autoPlay playsInline preload="metadata" className="max-h-full max-w-full rounded-xl" />
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Vorheriges Video" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-3 text-xl text-white">‹</button>
                <button type="button" onClick={() => go(1)} aria-label="Nächstes Video" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-3 text-xl text-white">›</button>
              </>
            )}
          </div>
          <div className="flex justify-center gap-2 px-4 py-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
            <a href={cur.download} className="rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-6 py-3 text-sm font-bold text-white">Herunterladen</a>
            {canShare && (
              <button type="button" onClick={share} className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white">Teilen</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

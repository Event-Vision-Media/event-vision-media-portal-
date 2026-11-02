"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Challenge } from "./challenges";

// Foto-Missionen in der Gäste-App: Auswahl, Spitzname, Bestenliste und Punkte-Feier.

export interface BoardData {
  top: { name: string; points: number; missions: number; me?: boolean }[];
  me: { rank: number | null; points: number; done: string[]; name: string | null } | null;
  players: number;
  topPhoto: { id: string; url: string; likes: number } | null;
}

export interface MissionWin {
  emoji: string;
  text: string;
  points: number;
  total: number;
  rank: number | null;
  players: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Unteres Blatt mit Hintergrund-Abdunklung; schließt per Tippen daneben.
 * Wird direkt an <body> gehängt – sonst „fängt“ eine Einblend-Animation (transform) im Elternelement das Fixed-Overlay ein.
 */
export function Sheet({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector<HTMLElement>(".vb") ?? document.body), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!host) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <button className="vb-backdrop absolute inset-0 bg-black/60" onClick={onClose} aria-label="Schließen" />
      <div className="vb-sheet relative max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-[#141417]/95 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
        {children}
      </div>
    </div>,
    host
  );
}

/** Missionen-Liste mit Fortschritt; erledigte Missionen bleiben sichtbar, aber abgehakt. */
export function MissionList({
  missions,
  done,
  active,
  consent,
  nudge,
  onConsent,
  onPick,
  onBoard,
}: {
  missions: Challenge[];
  done: Set<string>;
  active: string | null;
  consent: boolean;
  /** zählt hoch, wenn eine Mission ohne Galerie-Freigabe angetippt wurde → Hinweis wackelt */
  nudge: number;
  onConsent: () => void;
  onPick: (c: Challenge) => void;
  onBoard: () => void;
}) {
  const total = missions.reduce((s, m) => s + m.points, 0);
  const got = missions.filter((m) => done.has(m.id)).reduce((s, m) => s + m.points, 0);
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="vb-display text-2xl font-semibold">Foto-Missionen</p>
          <p className="mt-0.5 text-[13px] text-white/60">Erfülle Aufgaben, sammle Punkte – die Besten erscheinen auf der Foto-Wand.</p>
        </div>
        <button onClick={onBoard} className="vb-glass flex-none rounded-full px-3 py-1.5 text-xs font-semibold text-white/85">
          🏆 Bestenliste
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/60">
          <span>
            {done.size} von {missions.length} erledigt
          </span>
          <span className="font-semibold" style={{ color: "var(--a)" }}>
            {got} / {total} Punkte
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${total ? (got / total) * 100 : 0}%`, background: "var(--a)" }} />
        </div>
      </div>

      {!consent && (
        <button key={nudge} onClick={onConsent} className={`${nudge ? "vb-shake " : ""}mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-left`}>
          <span className="flex-1 text-[13px] leading-snug text-amber-100">
            <strong className="block">Punkte gibt&apos;s nur für geteilte Fotos</strong>
            Tippe hier, damit deine Fotos in Galerie &amp; Foto-Wand erscheinen.
          </span>
          <span className="vb-switch" data-on={false} />
        </button>
      )}

      <ul className="mt-4 space-y-2">
        {missions.map((m, i) => {
          const isDone = done.has(m.id);
          const isActive = active === m.id;
          return (
            <li key={m.id} className="vb-in" style={{ animationDelay: `${i * 35}ms` }}>
              <button
                onClick={() => !isDone && onPick(m)}
                disabled={isDone}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition active:scale-[0.98] ${isActive ? "ring-2" : ""} ${isDone ? "bg-white/[0.03]" : "vb-glass"}`}
                style={isActive ? { ["--tw-ring-color" as string]: "var(--a)" } : undefined}
              >
                <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl text-2xl ${isDone ? "opacity-40 grayscale" : "bg-white/10"}`}>{m.emoji}</span>
                <span className={`flex-1 text-[14px] font-medium leading-snug ${isDone ? "text-white/40 line-through decoration-white/30" : "text-white"}`}>{m.text}</span>
                {isDone ? (
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--a)", color: "var(--ink)" }}>
                    ✓
                  </span>
                ) : (
                  <span className="flex-none rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--a) 22%, transparent)", color: "var(--a)" }}>
                    +{m.points}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {done.size === missions.length && missions.length > 0 && (
        <p className="vb-pop mt-4 rounded-2xl bg-white/5 px-4 py-3 text-center text-sm font-semibold">🎉 Alle Missionen geschafft – Respekt!</p>
      )}
    </>
  );
}

/** Spitzname für die Bestenliste abfragen. */
export function NameForm({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<string | null> }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await onSave(name.trim()));
        setBusy(false);
      }}
    >
      <p className="text-4xl">🏆</p>
      <p className="vb-display mt-2 text-2xl font-semibold">Wie heißt du?</p>
      <p className="mt-1 text-[13px] text-white/60">So erscheinst du auf der Bestenliste. Vorname oder Spitzname reicht.</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        placeholder="z. B. Tante Anna"
        className="mt-5 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-[17px] text-white outline-none placeholder:text-white/30 focus:border-[color:var(--a)]"
        enterKeyHint="go"
      />
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <button disabled={busy || name.trim().length < 2} className="vb-btn mt-4 w-full rounded-full py-4 text-[16px] font-bold disabled:opacity-50">
        {busy ? "Speichert …" : "Weiter zur Mission"}
      </button>
    </form>
  );
}

/** Bestenliste mit eigener Platzierung und „Foto des Abends“. */
export function BoardView({ slug, guest }: { slug: string; guest: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  useEffect(() => {
    fetch(`/api/vb/${slug}/board`, { headers: { "x-vb-guest": guest }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [slug, guest]);

  if (!data) return <div className="vb-shimmer h-64 rounded-2xl bg-white/5" />;
  const meOutside = data.me?.rank && !data.top.some((r) => r.me);
  return (
    <>
      <p className="vb-display text-2xl font-semibold">🏆 Bestenliste</p>
      <p className="mt-0.5 text-[13px] text-white/60">{data.players === 1 ? "1 Gast sammelt" : `${data.players} Gäste sammeln`} gerade Punkte.</p>
      {data.top.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/70">Noch niemand hat eine Mission erfüllt – sei die oder der Erste! 🚀</p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {data.top.map((r, i) => (
            <li
              key={i}
              className={`vb-in flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${r.me ? "ring-2" : "bg-white/5"}`}
              style={{ animationDelay: `${i * 40}ms`, ...(r.me ? { background: "color-mix(in srgb, var(--a) 16%, transparent)", ["--tw-ring-color" as string]: "var(--a)" } : {}) }}
            >
              <span className="w-8 text-center text-lg font-bold">{MEDALS[i] ?? <span className="text-sm text-white/50">{i + 1}.</span>}</span>
              <span className="flex-1 truncate text-[15px] font-semibold">
                {r.name}
                {r.me && <span className="ml-1.5 text-xs font-normal text-white/60">(du)</span>}
              </span>
              <span className="text-xs text-white/50">{r.missions}×🎯</span>
              <span className="w-14 text-right text-[15px] font-bold" style={{ color: "var(--a)" }}>
                {r.points}
              </span>
            </li>
          ))}
        </ol>
      )}
      {meOutside && (
        <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-center text-sm">
          Du bist auf <strong>Platz {data.me!.rank}</strong> mit {data.me!.points} Punkten – weiter so!
        </p>
      )}
      {data.topPhoto && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">❤️ Foto des Abends · {data.topPhoto.likes === 1 ? "1 Herz" : `${data.topPhoto.likes} Herzen`}</p>
          <img src={data.topPhoto.url} alt="" className="w-full rounded-2xl" />
        </div>
      )}
    </>
  );
}

/** Große Punkte-Feier nach einer erfüllten Mission. */
export function MissionWinCard({ win, onNext, onBoard }: { win: MissionWin; onNext: () => void; onBoard: () => void }) {
  return (
    <div className="vb-pop relative overflow-hidden rounded-3xl p-5 text-center" style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--a) 38%, #141417), #141417 70%)" }}>
      <div className="vb-shimmer pointer-events-none absolute inset-0 opacity-60" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Mission erfüllt</p>
      <p className="vb-points vb-display relative mt-1 text-6xl font-bold" style={{ color: "var(--a)" }}>
        +{win.points}
      </p>
      <p className="relative mt-1 text-sm text-white/80">
        {win.emoji} {win.text}
      </p>
      <p className="relative mt-3 text-[15px] font-semibold">
        {win.rank ? (
          <>
            {win.rank <= 3 ? MEDALS[win.rank - 1] + " " : ""}Platz {win.rank} von {win.players} · {win.total} Punkte
          </>
        ) : (
          <>{win.total} Punkte</>
        )}
      </p>
      <div className="relative mt-4 flex gap-2">
        <button onClick={onNext} className="vb-btn flex-1 rounded-full py-3 text-sm font-bold">
          🎯 Nächste Mission
        </button>
        <button onClick={onBoard} className="vb-glass flex-1 rounded-full py-3 text-sm font-semibold">
          🏆 Bestenliste
        </button>
      </div>
    </div>
  );
}

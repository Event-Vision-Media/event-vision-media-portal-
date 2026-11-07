"use client";

import { useState } from "react";

/** Gästebuch-Gruß zum eigenen Foto – kurz, freiwillig, landet im Gästebuch der Gastgeber. */
export function GreetingCard({ slug, photoId, guestKey, defaultName }: { slug: string; photoId: string; guestKey: string; defaultName: string | null }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    setState("busy");
    const res = await fetch(`/api/vb/${slug}/gruss`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vb-guest": guestKey },
      body: JSON.stringify({ photoId, message, name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error || "Das hat nicht geklappt – versuch es nochmal.");
      setState("idle");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="vb-pop rounded-2xl px-4 py-3.5 text-center text-[14px] font-semibold" style={{ background: "color-mix(in srgb, var(--a) 22%, rgba(20,20,23,0.85))", border: "1px solid color-mix(in srgb, var(--a) 50%, transparent)" }}>
        Danke für deinen Gruß – er steht jetzt im Gästebuch 💛
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="vb-glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-xl" style={{ background: "color-mix(in srgb, var(--a) 25%, transparent)" }} aria-hidden>
          ✍️
        </span>
        <span className="flex-1 text-[13px] leading-snug text-white/75">
          <span className="block text-[15px] font-semibold text-white">Gruß ins Gästebuch schreiben</span>
          Ein paar liebe Worte zu deinem Foto – die Gastgeber freuen sich!
        </span>
        <span className="text-xl text-white/50">›</span>
      </button>
    );
  }

  return (
    <div className="vb-glass space-y-3 rounded-2xl p-4">
      <p className="text-[15px] font-semibold">Dein Gruß fürs Gästebuch ✍️</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={280}
        rows={3}
        autoFocus
        placeholder="z. B. Alles Liebe für eure gemeinsame Zukunft!"
        className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[15px] text-white placeholder:text-white/35 focus:border-[color:var(--a)] focus:outline-none"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Dein Name (optional)"
        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[15px] text-white placeholder:text-white/35 focus:border-[color:var(--a)] focus:outline-none"
      />
      {error && <p className="text-[13px] text-amber-200">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={send} disabled={state === "busy" || message.trim().length < 2} className="vb-btn flex-1 rounded-full py-3 text-[15px] font-bold disabled:opacity-50">
          {state === "busy" ? "Wird gespeichert …" : "Ins Gästebuch"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-white/55 underline">
          Abbrechen
        </button>
      </div>
      <p className="text-[11.5px] text-white/45">Erscheint mit deinem Foto im Gästebuch der Gastgeber. {280 - message.length} Zeichen frei.</p>
    </div>
  );
}

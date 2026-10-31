"use client";

import { useState, useTransition } from "react";
import { setVbPhotoHidden } from "@/app/actions/admin-visionbooth";

interface Photo {
  id: string;
  kind: string;
  style: string | null;
  hidden: boolean;
  createdAt: string;
  url: string;
}

/** Fotos eines Events; Klick aufs Auge blendet ein Foto auf Wand und Galerie aus/ein. */
export function VbPhotoGrid({ eventId, photos }: { eventId: string; photos: Photo[] }) {
  const [hidden, setHidden] = useState(() => new Map(photos.map((p) => [p.id, p.hidden])));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!photos.length) return <p className="text-sm text-anthracite-400">Noch keine Fotos.</p>;

  function toggle(id: string) {
    const next = !hidden.get(id);
    setHidden((m) => new Map(m).set(id, next));
    start(async () => {
      const r = await setVbPhotoHidden(eventId, id, next);
      if (r.error) {
        setError(r.error);
        setHidden((m) => new Map(m).set(id, !next));
      }
    });
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => {
          const isHidden = hidden.get(p.id);
          return (
            <div key={p.id} className="group relative overflow-hidden rounded-lg bg-anthracite-900">
              <a href={p.url} target="_blank">
                <img src={p.url} alt="" loading="lazy" className={`aspect-[4/5] w-full object-cover transition ${isHidden ? "opacity-25 grayscale" : ""}`} />
              </a>
              {p.kind === "ki" && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">✨ KI</span>}
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(p.id)}
                className={`absolute bottom-1.5 right-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${isHidden ? "bg-gold-500 text-white" : "bg-white/90 text-anthracite-700"}`}
              >
                {isHidden ? "Einblenden" : "Ausblenden"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

/** Gast war schon bei einem laufenden Event: auf visionbooth.de direkt zurück dorthin – ohne neu zu scannen. */
export function ReturnBanner() {
  const [last, setLast] = useState<{ slug: string; title: string } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("vb-last") || "null") as { slug: string; title: string; until: string } | null;
      if (v?.slug && v.until && new Date(v.until) > new Date() && /^[a-z0-9-]+$/.test(v.slug)) setLast({ slug: v.slug, title: String(v.title || "").slice(0, 40) });
    } catch {
      /* nichts gemerkt */
    }
  }, []);
  if (!last) return null;
  return (
    <a
      href={`/vb/${last.slug}?von=start`}
      className="fixed inset-x-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg,#e2bd6f,#c4933f)", color: "#1a1408" }}
    >
      <span className="text-2xl">📸</span>
      <span className="flex-1 text-[14px] leading-snug">
        <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Zurück zu deinem Event</span>
        <strong>{last.title || "Deine Fotobox"}</strong>
      </span>
      <span className="text-xl font-bold">›</span>
    </a>
  );
}

"use client";

import { useEffect, useState } from "react";
import { activeVbPromo, type VbPromo } from "@/lib/vb-promo";

/** Hinweis auf eine laufende Aktion (z. B. Black Week) – erscheint und verschwindet von selbst. */
export function VbPromoBanner({ className = "" }: { className?: string }) {
  // erst im Browser entscheiden – statisch gebaute Seiten zeigen so trotzdem den aktuellen Stand
  const [promo, setPromo] = useState<VbPromo | null>(null);
  useEffect(() => setPromo(activeVbPromo()), []);
  if (!promo) return null;
  return (
    <div className={className}>
    <a
      href="/vb/buchen"
      className="vb-in inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-bold shadow-lg"
      style={{ background: "linear-gradient(180deg, #f0d595, #c9a04e)", color: "#1a1408" }}
    >
      <span className="rounded-full bg-[#1a1408] px-2 py-0.5 text-[11px] text-[#f0d595]">{promo.label}</span>
      −{promo.percent} % auf alles · bis {promo.untilShort}
    </a>
    </div>
  );
}

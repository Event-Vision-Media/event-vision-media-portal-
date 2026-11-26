"use client";

import { useState } from "react";

/**
 * Bewertungsbitte per WhatsApp (fertiger Text mit persönlichem Link) – vor allem für Kunden
 * ohne E-Mail-Adresse. Der Link zählt den Klick mit, damit keine doppelte Erinnerung kommt.
 */
export function ReviewRequestButtons({ phone, greeting, sie, link }: { phone: string | null; greeting: string; sie: boolean; link: string }) {
  const [copied, setCopied] = useState(false);
  const text = sie
    ? `${greeting},\n\nvielen Dank, dass wir bei Ihrem Event dabei sein durften! Falls Sie zufrieden waren, würden Sie uns mit einer kurzen Google-Bewertung sehr helfen – das dauert keine zwei Minuten:\n${link}\n\nHerzliche Grüße\nDustin von Event Vision Media`
    : `${greeting},\n\ndanke, dass wir bei eurem Event dabei sein durften! 💛 Wenn es dir gefallen hat, würdest du uns mit einer kurzen Google-Bewertung riesig helfen – dauert keine zwei Minuten:\n${link}\n\nLiebe Grüße\nDustin von Event Vision Media`;
  const wa = phone ? phone.replace(/[^\d+]/g, "").replace(/^00/, "").replace(/^0/, "49").replace(/^\+/, "") : "";
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {wa && (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Bewertungsbitte per WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}
        className="rounded-lg border border-anthracite-200 bg-white px-3 py-1.5 text-xs font-medium text-anthracite-700 hover:border-gold-300"
      >
        {copied ? "Text kopiert ✓" : "Text mit Link kopieren"}
      </button>
    </div>
  );
}

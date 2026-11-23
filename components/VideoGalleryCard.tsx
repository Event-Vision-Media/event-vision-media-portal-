"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extendGallery } from "@/app/actions/gallery-extend";
import { GALLERY_DAYS, GALLERY_EXTENSIONS, GALLERY_MAX_DAYS } from "@/lib/event-gallery";

/** Kundenportal: Link zur 360°-Video-Galerie, Laufzeit und Verlängerung (+30 / +60 Tage). */
export function VideoGalleryCard({
  sie,
  url,
  count,
  expiresAt,
  extensionDays,
}: {
  sie: boolean;
  url: string;
  count: number;
  expiresAt: string;
  extensionDays: number;
}) {
  const t = (du: string, s: string) => (sie ? s : du);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const until = new Date(expiresAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const left = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  const options = GALLERY_EXTENSIONS.filter((o) => GALLERY_DAYS + extensionDays + o.days <= GALLERY_MAX_DAYS);

  function extend(days: number, price: number) {
    setError(null);
    if (!confirm(t(`Galerie um ${days} Tage verlängern für ${price} €? Der Betrag kommt zu deinem Restbetrag bzw. als Nachzahlung.`, `Galerie um ${days} Tage verlängern für ${price} €? Der Betrag kommt zu Ihrem Restbetrag bzw. als Nachzahlung.`))) return;
    start(async () => {
      const r = await extendGallery(days);
      if (r.error) setError(r.error);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-anthracite-900 p-6 text-white shadow-card sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">360°-Videos</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold">{t("Eure Videos sind online 🎬", "Ihre Videos sind online 🎬")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {count} {count === 1 ? "Video" : "Videos"} {t("zum Anschauen, Herunterladen und Teilen – schickt den Link gern an eure Gäste.", "zum Anschauen, Herunterladen und Teilen – den Link können Sie gern an Ihre Gäste weitergeben.")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={url} target="_blank" rel="noopener" className="rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-anthracite-900">Galerie öffnen</a>
        <button type="button" onClick={() => navigator.clipboard?.writeText(url).catch(() => {})} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90">Link kopieren</button>
      </div>
      <div className="mt-5 rounded-2xl bg-white/[0.06] p-4">
        <p className="text-sm">
          Online bis <strong>{until}</strong> <span className="text-white/55">(noch {left} {left === 1 ? "Tag" : "Tage"})</span>
        </p>
        {options.length > 0 ? (
          <>
            <p className="mt-1 text-xs text-white/55">{t("Danach werden die Videos gelöscht. Länger behalten?", "Danach werden die Videos gelöscht. Länger behalten?")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((o) => (
                <button key={o.days} type="button" disabled={pending} onClick={() => extend(o.days, o.price)} className="rounded-full border border-gold-300/50 px-4 py-2 text-sm font-semibold text-gold-200 hover:bg-white/5 disabled:opacity-50">
                  + {o.days} Tage · {o.price} €
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs text-white/55">{t("Tipp: Ladet eure Lieblingsvideos rechtzeitig herunter.", "Tipp: Laden Sie Ihre Lieblingsvideos rechtzeitig herunter.")}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
      </div>
    </section>
  );
}

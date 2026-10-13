"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDevicePackage } from "@/app/actions/upgrade";

export interface CrossSellOffer {
  id: string;
  name: string;
  price: number;
  img: string;
  /** Kurzer Vorteil unter dem Namen. */
  tagline: string;
  /** "Nur noch 1 frei" – nur wenn das wirklich so ist. */
  lastOne?: boolean;
}

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

/**
 * Für Buchungen ohne Fotogerät (z. B. nur Audiogästebuch): zeigt, welche
 * Fotospiegel/Fotoboxen am Eventtag noch frei sind – mit Dazubuchen in zwei Schritten.
 */
export function DeviceCrossSell({ offers, dateLabel, sie }: { offers: CrossSellOffer[]; dateLabel: string; sie: boolean }) {
  const t = (ihr: string, s: string) => (sie ? s : ihr);
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function book(o: CrossSellOffer) {
    setError(null);
    start(async () => {
      const r = await addDevicePackage(o.id);
      if (r.error) return setError(r.error);
      setDone(o.name);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <p className="font-serif text-lg font-semibold">✓ {done} ist dazugebucht!</p>
        <p className="mt-1">{t("Wir melden uns, um Lieferung und Aufbau mit euch abzustimmen.", "Wir melden uns, um Lieferung und Aufbau mit Ihnen abzustimmen.")}</p>
      </div>
    );
  }

  return (
    <section className="animate-fade-in-up overflow-hidden rounded-2xl border border-gold-200 bg-gradient-to-br from-anthracite-900 via-anthracite-800 to-anthracite-900 text-white shadow-card">
      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">{t("Noch frei an eurem Tag", "Noch frei an Ihrem Termin")}</p>
        <h2 className="mt-1 font-serif text-xl font-semibold sm:text-2xl">
          {t("Fotos zum Mitnehmen für eure Gäste?", "Fotos zum Mitnehmen für Ihre Gäste?")}
        </h2>
        <p className="mt-1 text-sm text-anthracite-200">
          {t(
            `Am ${dateLabel} ist noch frei – mit Lieferung, Aufbau, Druckflatrate und Online-Galerie. Eure Gäste nehmen ihre Fotos direkt mit nach Hause.`,
            `Am ${dateLabel} ist noch frei – mit Lieferung, Aufbau, Druckflatrate und Online-Galerie.`
          )}
        </p>
      </div>
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3 sm:px-6 sm:pb-6">
        {offers.map((o) => (
          <div key={o.id} className="flex flex-col overflow-hidden rounded-xl bg-white text-anthracite-800">
            <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.img} alt={o.name} className="h-full w-full object-cover" loading="lazy" />
              <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${o.lastOne ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
                {o.lastOne ? "Nur noch 1 frei" : "✓ Frei"}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="font-medium">{o.name}</p>
              <p className="text-xs text-anthracite-500">{o.tagline}</p>
              <p className="mt-2 font-serif text-lg font-semibold">{euro(o.price)}</p>
              {confirm === o.id ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-anthracite-500">{t(`Für ${euro(o.price)} verbindlich dazubuchen?`, `Für ${euro(o.price)} verbindlich dazubuchen?`)}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-anthracite-200 px-3 py-2 text-xs font-medium">
                      Abbrechen
                    </button>
                    <button type="button" disabled={isPending} onClick={() => book(o)} className="flex-1 rounded-lg bg-gold-600 px-3 py-2 text-xs font-semibold text-white hover:bg-gold-700 disabled:opacity-50">
                      {isPending ? "Bucht …" : "Ja, dazubuchen"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(o.id)} className="mt-2 rounded-lg bg-anthracite-800 px-3 py-2 text-sm font-medium text-white hover:bg-anthracite-700">
                  Dazubuchen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="px-6 pb-4 text-sm text-red-300">{error}</p>}
      <p className="border-t border-white/10 px-6 py-3 text-xs text-anthracite-300">
        {t("Anfahrt bis 30 km um Essen inklusive · Lieferzeiten stimmen wir danach mit euch ab.", "Anfahrt bis 30 km um Essen inklusive · Lieferzeiten stimmen wir danach mit Ihnen ab.")}
      </p>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookDelivery, deliveryQuote, type DeliveryQuote } from "@/app/actions/upgrade";

export interface DeliveryUpsellItem {
  key: string;
  deviceName: string;
  targetName: string;
  price: number;
  perks: string[];
}

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

/**
 * „Lieber ganz bequem?“ – Lieferung, Aufbau und Abholung nachträglich dazubuchen, solange der
 * Mietvertrag noch nicht unterschrieben ist. Zweistufig: erst Preis inkl. Anfahrt sehen, dann buchen.
 * Nach der Unterschrift bzw. kurz vor dem Event nur noch per WhatsApp.
 */
/** Liste der Karten – bleibt nach dem Buchen stehen, damit die Bestätigung sichtbar bleibt (die Karte selbst entfällt dann). */
export function DeliveryUpsellList({ items, sie, mode }: { items: DeliveryUpsellItem[]; sie: boolean; mode: "open" | "contact" }) {
  const [booked, setBooked] = useState<null | "booked" | "contact">(null);
  return (
    <>
      {booked && <DoneNote kind={booked} sie={sie} />}
      {items.map((item) => (
        <DeliveryUpsellCard key={item.key} item={item} sie={sie} mode={mode} onDone={setBooked} />
      ))}
    </>
  );
}

function DoneNote({ kind, sie }: { kind: "booked" | "contact"; sie: boolean }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
      <strong className="block font-serif text-base">{kind === "booked" ? "Lieferung gebucht ✓" : "Danke – wir melden uns!"}</strong>
      {kind === "booked"
        ? sie
          ? "Wir bringen alles zur Location, bauen auf und holen es wieder ab. Den neuen Gesamtpreis sehen Sie oben, die Lieferzeit wählen Sie beim Mietvertrag."
          : "Wir bringen alles zur Location, bauen auf und holen es wieder ab. Den neuen Gesamtpreis seht ihr oben, die Lieferzeit wählt ihr beim Mietvertrag."
        : sie
          ? "Die Entfernung zur Location prüfen wir kurz persönlich und melden uns mit dem Preis bei Ihnen."
          : "Die Entfernung zur Location prüfen wir kurz persönlich und melden uns mit dem Preis bei euch."}
    </div>
  );
}

function DeliveryUpsellCard({ item, sie, mode, onDone }: { item: DeliveryUpsellItem; sie: boolean; mode: "open" | "contact"; onDone: (k: "booked" | "contact") => void }) {
  const [pickup, setPickup] = useState<"folgetag" | "abend">("folgetag");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const wa = `https://wa.me/4917622748363?text=${encodeURIComponent(`Hallo! Wir würden gern die Lieferung für ${item.deviceName} dazubuchen.`)}`;

  function check() {
    setError(null);
    start(async () => {
      const q = await deliveryQuote(item.key, pickup);
      if (q.error) return setError(q.error);
      setQuote(q);
    });
  }

  function book() {
    setError(null);
    start(async () => {
      const r = await bookDelivery(item.key, pickup);
      if (r.error) return setError(r.error);
      onDone(r.contact ? "contact" : "booked");
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gold-200 bg-gradient-to-br from-white to-gold-50 p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-anthracite-900 text-2xl shadow-glow" aria-hidden="true">
          🚚
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-700">Lieber ganz bequem?</p>
          <p className="mt-1 font-serif text-xl font-semibold text-anthracite-800">
            Wir liefern {item.deviceName} <span className="text-gold-700">für +{euro(item.price)}</span>
          </p>
          <p className="mt-1 text-sm text-anthracite-500">
            {sie ? "Kein Transport, kein Aufbau – Sie müssen sich um nichts kümmern." : "Kein Transport, kein Aufbau – ihr müsst euch um nichts kümmern."}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-anthracite-700">
        {item.perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-gold-600">✓</span>
            {perk}
          </li>
        ))}
      </ul>

      {mode === "contact" ? (
        <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm text-anthracite-600">
          {sie ? "Der Mietvertrag ist schon unterschrieben bzw. Ihr Event steht kurz bevor – schreiben Sie uns kurz, wir tragen die Lieferung gern für Sie ein." : "Euer Mietvertrag ist schon unterschrieben bzw. euer Event steht kurz bevor – schreibt uns kurz, wir tragen die Lieferung gern für euch ein."}
          <a href={wa} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-anthracite-900 px-4 py-2.5 font-medium text-white hover:bg-anthracite-800">
            Per WhatsApp schreiben
          </a>
        </div>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-anthracite-700">Wann sollen wir wieder abholen?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["folgetag", "Am Folgetag", "kostenlos"],
                  ["abend", "Am selben Abend bis 22 Uhr", "kostenlos"],
                ] as const
              ).map(([id, label, note]) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${pickup === id ? "border-gold-400 bg-white" : "border-anthracite-100 bg-white/60"}`}>
                  <input type="radio" name={`pickup-${item.key}`} checked={pickup === id} onChange={() => { setPickup(id); setQuote(null); }} />
                  <span className="flex-1 text-anthracite-700">{label}</span>
                  <span className="text-xs text-anthracite-400">{note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {!quote ? (
            <button type="button" onClick={check} disabled={pending} className="mt-4 inline-flex rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-3 text-sm font-medium text-white shadow-glow transition hover:from-gold-500 hover:to-gold-700 disabled:opacity-60">
              {pending ? "Einen Moment…" : "Lieferung dazubuchen"}
            </button>
          ) : quote.contact ? (
            <div className="mt-4 rounded-xl border border-anthracite-100 bg-white p-4 text-sm text-anthracite-600">
              {sie ? "Für Ihre Location berechnen wir die Anfahrt lieber persönlich." : "Für eure Location berechnen wir die Anfahrt lieber persönlich."}
              <button type="button" onClick={book} disabled={pending} className="mt-3 flex rounded-lg bg-anthracite-900 px-4 py-2.5 font-medium text-white hover:bg-anthracite-800 disabled:opacity-60">
                {pending ? "Wird gesendet…" : "Lieferung anfragen"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-gold-200 bg-white p-4 text-sm">
              <div className="flex justify-between py-0.5 text-anthracite-600"><span>{item.targetName}</span><span>+{euro(quote.price ?? item.price)}</span></div>
              <div className="flex justify-between py-0.5 text-anthracite-600">
                <span>Anfahrt{quote.km ? ` (ca. ${quote.km} km)` : ""}</span>
                <span>{quote.travelPrice ? `+${euro(quote.travelPrice)}` : "inklusive"}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-anthracite-100 pt-2 font-semibold text-anthracite-800">
                <span>Neuer Gesamtpreis</span><span>{euro(quote.newTotal ?? 0)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={book} disabled={pending} className="rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2.5 font-medium text-white disabled:opacity-60">
                  {pending ? "Wird gebucht…" : "Ja, verbindlich dazubuchen"}
                </button>
                <button type="button" onClick={() => setQuote(null)} className="rounded-lg px-4 py-2.5 text-anthracite-500 hover:text-anthracite-800">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

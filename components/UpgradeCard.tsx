"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upgradePackage } from "@/app/actions/upgrade";

export interface UpgradeCardOffer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  diff: number;
  perks: string[];
}

/**
 * Upgrade-Angebot im Dashboard: nächsthöheres Paket mit Aufpreis und
 * Vorteilen. Zweistufig (Klick → Bestätigen), damit nichts versehentlich
 * gebucht wird.
 */
export function UpgradeCard({ offer, sie }: { offer: UpgradeCardOffer; sie: boolean }) {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  // Name beim Buchen merken – nach dem Neuladen enthält "offer" schon das nächste Angebot
  const [bookedName, setBookedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

  function book() {
    setError(null);
    startTransition(async () => {
      const res = await upgradePackage(offer.fromId, offer.toId);
      if (res.error) return setError(res.error);
      setBookedName(offer.toName);
      setStep("done");
      router.refresh();
    });
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <strong className="block font-serif text-base">Upgrade gebucht ✓</strong>
        {sie ? `Sie haben jetzt ${bookedName}.` : `Ihr habt jetzt ${bookedName}.`} Der neue Gesamtpreis steht oben in {sie ? "Ihrer" : "eurer"} Buchung.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-anthracite-800 bg-anthracite-900 p-5 text-white shadow-card sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-300">Upgrade</p>
      <p className="mt-1 font-serif text-xl font-semibold">
        {offer.toName} <span className="text-gold-300">für nur +{euro(offer.diff)}</span>
      </p>
      <p className="mt-1 text-sm text-anthracite-300">statt {offer.fromName} – das kommt dazu:</p>
      <ul className="mt-3 space-y-1.5 text-sm text-anthracite-100">
        {offer.perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-gold-300">✓</span>
            {perk}
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}

      {step === "idle" ? (
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="mt-4 inline-flex rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-3 text-sm font-medium text-white shadow-glow transition hover:from-gold-500 hover:to-gold-700"
        >
          Jetzt upgraden
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3">
          <p className="text-sm">
            {offer.fromName} → <strong>{offer.toName}</strong> für <strong>+{euro(offer.diff)}</strong>. Verbindlich buchen?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={book}
              disabled={isPending}
              className="rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Wird gebucht…" : "Ja, upgraden"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className="rounded-lg px-4 py-2 text-sm text-anthracite-300 hover:text-white">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

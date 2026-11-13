"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { setPaymentTerms } from "@/app/actions/admin-payment-terms";

/** Zahlungsweise pro Buchung: Anzahlung + Rest (Standard) oder Gesamtbetrag auf einmal. */
export function PaymentTermsCard({
  bookingId,
  current,
  locked,
  shortNotice,
  depositAmount,
  depositPaid,
}: {
  bookingId: string;
  /** "standard" | "full7" | "full14" | "after7" | "after14" */
  current: string;
  /** Grund, warum nicht mehr änderbar (Vertrag unterschrieben / schon bezahlt) */
  locked: string | null;
  shortNotice: boolean;
  /** Aktuelle individuelle Anzahlung (falls gesetzt) */
  depositAmount: number | null;
  depositPaid: boolean;
}) {
  const [mode, setMode] = useState(current);
  const [amount, setAmount] = useState(depositAmount != null ? String(depositAmount).replace(".", ",") : "");
  const [paid, setPaid] = useState(depositPaid);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const amountNum = Number(amount.replace(/\./g, "").replace(",", "."));
  const changed = mode !== current || (mode === "deposit" && (amountNum !== depositAmount || paid !== depositPaid));

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await setPaymentTerms(bookingId, mode, mode === "deposit" ? { amount: amountNum, paid } : undefined);
      if (r.error) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  }

  const options = [
    { id: "standard", label: "Anzahlung + Restbetrag", hint: "Standard: 20 % Anzahlung nach Vertrag, Rest 14 Tage vorher oder bar" },
    { id: "full14", label: "Gesamtbetrag auf einmal – 14 Tage vorher", hint: "Keine Anzahlung, eine Rechnung über alles" },
    { id: "full7", label: "Gesamtbetrag auf einmal – 7 Tage vorher", hint: "Keine Anzahlung, eine Rechnung über alles" },
    { id: "after14", label: "Rechnung nach der Veranstaltung – zahlbar in 14 Tagen", hint: "Z. B. Städte/Behörden: keine Anzahlung, keine Zahlungserinnerung vor dem Event" },
    { id: "after7", label: "Rechnung nach der Veranstaltung – zahlbar in 7 Tagen", hint: "Keine Anzahlung, keine Zahlungserinnerung vor dem Event" },
    { id: "deposit", label: "Individuelle Anzahlung", hint: "Eigener Betrag, z. B. wenn schon vor dem Portal etwas angezahlt wurde – Rest wie gewohnt 14 Tage vorher oder bar" },
  ];

  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">Zahlungsweise</h2>
      {shortNotice && (
        <p className="mt-2 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">Kurzfristige Buchung: Es gilt ohnehin „keine Anzahlung, Gesamtbetrag 3 Tage nach Rechnung“.</p>
      )}
      <div className="mt-3 space-y-2">
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${mode === o.id ? "border-anthracite-800 bg-sand-50" : "border-anthracite-100"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}>
            <input type="radio" name={`pay-${bookingId}`} className="mt-1" checked={mode === o.id} disabled={Boolean(locked) || (depositPaid && o.id !== "deposit")} onChange={() => { setMode(o.id); setSaved(false); }} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-anthracite-800">{o.label}</span>
              <span className="block text-xs text-anthracite-500">{o.hint}</span>
              {o.id === "deposit" && mode === "deposit" && !locked && (
                <span className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setSaved(false); }}
                      placeholder="z. B. 100"
                      className="input-field w-28 py-1.5 text-sm"
                      aria-label="Anzahlung in Euro"
                    />
                    <span className="text-anthracite-600">€</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-anthracite-700">
                    <input type="checkbox" checked={paid} onChange={(e) => { setPaid(e.target.checked); setSaved(false); }} />
                    schon bezahlt
                  </span>
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {locked && <p className="mt-2 text-sm text-anthracite-500">{locked}</p>}
      {!locked && depositPaid && <p className="mt-2 text-xs text-anthracite-500">Die Anzahlung ist schon abgehakt – deshalb ist nur noch „Individuelle Anzahlung“ wählbar.</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {!locked && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={save} disabled={pending || !changed || (mode === "deposit" && (!amount.trim() || !Number.isFinite(amountNum)))} className="rounded-xl bg-anthracite-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {pending ? "Speichert…" : "Speichern"}
          </button>
          {saved && !changed && <span className="text-sm text-emerald-700">Gespeichert ✓</span>}
        </div>
      )}
      <p className="mt-3 text-xs text-anthracite-400">Gilt für Mietvertrag, Zahlungsübersicht im Kundenportal und die Zahlungserinnerungen. Änderbar, solange der Vertrag noch nicht unterschrieben und nichts bezahlt ist.</p>
    </Card>
  );
}

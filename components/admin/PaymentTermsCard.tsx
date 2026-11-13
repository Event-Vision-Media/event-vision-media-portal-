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
}: {
  bookingId: string;
  /** "standard" | "full7" | "full14" */
  current: string;
  /** Grund, warum nicht mehr änderbar (Vertrag unterschrieben / schon bezahlt) */
  locked: string | null;
  shortNotice: boolean;
}) {
  const [mode, setMode] = useState(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const changed = mode !== current;

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await setPaymentTerms(bookingId, mode);
      if (r.error) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  }

  const options = [
    { id: "standard", label: "Anzahlung + Restbetrag", hint: "Standard: 20 % Anzahlung nach Vertrag, Rest 14 Tage vorher oder bar" },
    { id: "full14", label: "Gesamtbetrag auf einmal – 14 Tage vorher", hint: "Keine Anzahlung, eine Rechnung über alles" },
    { id: "full7", label: "Gesamtbetrag auf einmal – 7 Tage vorher", hint: "Keine Anzahlung, eine Rechnung über alles" },
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
            <input type="radio" name={`pay-${bookingId}`} className="mt-1" checked={mode === o.id} disabled={Boolean(locked)} onChange={() => { setMode(o.id); setSaved(false); }} />
            <span>
              <span className="block font-medium text-anthracite-800">{o.label}</span>
              <span className="block text-xs text-anthracite-500">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {locked && <p className="mt-2 text-sm text-anthracite-500">{locked}</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {!locked && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={save} disabled={pending || !changed} className="rounded-xl bg-anthracite-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {pending ? "Speichert…" : "Speichern"}
          </button>
          {saved && !changed && <span className="text-sm text-emerald-700">Gespeichert ✓</span>}
        </div>
      )}
      <p className="mt-3 text-xs text-anthracite-400">Gilt für Mietvertrag, Zahlungsübersicht im Kundenportal und die Zahlungserinnerungen. Änderbar, solange der Vertrag noch nicht unterschrieben und nichts bezahlt ist.</p>
    </Card>
  );
}

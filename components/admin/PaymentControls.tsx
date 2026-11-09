"use client";

import { useState, useTransition } from "react";
import { setPaymentReceived, setRestPaymentMethod } from "@/app/actions/payments";

/** Haken "erhalten" für Anzahlung/Rest und Auswahl der Zahlungsart (Admin). */
export function PaymentControls({
  bookingId,
  depositPaid,
  restPaid,
  method,
  compact = false,
  noDeposit = false,
  followUp = false,
  customer = null,
  depositAmount = null,
  restAmount = null,
}: {
  bookingId: string;
  depositPaid: boolean;
  restPaid: boolean;
  method: "ueberweisung" | "bar" | null;
  compact?: boolean;
  /** Gesamtpreis bis NO_DEPOSIT_UP_TO (250 €): keine Anzahlung, nur ein Haken für den Gesamtbetrag. */
  noDeposit?: boolean;
  /** Später zugebuchte Leistung offen: Haken und Zahlungsart gelten für die Nachzahlung. */
  followUp?: boolean;
  /** Für die Rückfrage: Name und Beträge */
  customer?: string | null;
  depositAmount?: number | null;
  restAmount?: number | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ text: string; kind: "deposit" | "rest"; back: boolean } | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
    });
  const eur = (n: number | null) => (n == null ? "" : ` ${n.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`);
  /** Haken setzen/entfernen – mit kurzer Rückfrage und „Rückgängig“ (es wird nie eine Mail verschickt). */
  function toggle(kind: "deposit" | "rest", label: string, v: boolean) {
    const amount = kind === "deposit" ? depositAmount : restAmount;
    const who = customer ? ` von ${customer}` : "";
    const q = v ? `${label}${eur(amount)}${who} als erhalten markieren?\n\n(Es wird keine E-Mail an den Kunden verschickt.)` : `${label}${who} wieder auf „offen“ setzen?`;
    if (!confirm(q)) return;
    start(async () => {
      const res = await setPaymentReceived(bookingId, kind, v);
      setError(res.error ?? null);
      if (!res.error) {
        setUndo({ text: v ? `${label} gespeichert` : "Wieder auf offen gesetzt", kind, back: !v });
        setTimeout(() => setUndo(null), 10000);
      }
    });
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      {!noDeposit && <Toggle
        label="Anzahlung erhalten"
        checked={depositPaid}
        disabled={pending}
        onChange={(v) => toggle("deposit", "Anzahlung", v)}
      />}
      <Toggle
        label={followUp ? (method === "bar" ? "Nachzahlung bar erhalten" : "Nachzahlung erhalten") : noDeposit ? (method === "bar" ? "Bar erhalten" : "Bezahlt") : method === "bar" ? "Rest bar erhalten" : "Rest erhalten"}
        checked={restPaid}
        disabled={pending}
        onChange={(v) => toggle("rest", followUp ? "Nachzahlung" : noDeposit ? "Gesamtbetrag" : "Restbetrag", v)}
      />
      {!compact && (
        <label className="flex items-center gap-2 text-sm text-anthracite-600">
          {followUp ? "Nachzahlung:" : "Restzahlung:"}
          <select
            className="rounded-lg border border-anthracite-200 bg-white px-2 py-1 text-sm"
            value={method ?? ""}
            disabled={pending}
            onChange={(e) => run(() => setRestPaymentMethod(bookingId, (e.target.value || null) as "ueberweisung" | "bar" | null))}
          >
            <option value="">noch offen</option>
            <option value="ueberweisung">Überweisung (bis 14 Tage vorher)</option>
            <option value="bar">Bar bei Übergabe (Lieferung/Abholung)</option>
          </select>
        </label>
      )}
      {undo && (
        <span className="inline-flex items-center gap-2 rounded-full bg-anthracite-900 px-3 py-1.5 text-xs text-white">
          {undo.text}
          <button
            type="button"
            className="font-semibold text-gold-300 underline underline-offset-2"
            onClick={() => {
              const u = undo;
              setUndo(null);
              run(() => setPaymentReceived(bookingId, u.kind, u.back));
            }}
          >
            Rückgängig
          </button>
        </span>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
        checked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-anthracite-300"}`}>
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

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
}: {
  bookingId: string;
  depositPaid: boolean;
  restPaid: boolean;
  method: "ueberweisung" | "bar" | null;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
    });

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      <Toggle
        label="Anzahlung erhalten"
        checked={depositPaid}
        disabled={pending}
        onChange={(v) => run(() => setPaymentReceived(bookingId, "deposit", v))}
      />
      <Toggle
        label={method === "bar" ? "Rest bar erhalten" : "Rest erhalten"}
        checked={restPaid}
        disabled={pending}
        onChange={(v) => run(() => setPaymentReceived(bookingId, "rest", v))}
      />
      {!compact && (
        <label className="flex items-center gap-2 text-sm text-anthracite-600">
          Restzahlung:
          <select
            className="rounded-lg border border-anthracite-200 bg-white px-2 py-1 text-sm"
            value={method ?? ""}
            disabled={pending}
            onChange={(e) => run(() => setRestPaymentMethod(bookingId, (e.target.value || null) as "ueberweisung" | "bar" | null))}
          >
            <option value="">noch offen</option>
            <option value="ueberweisung">Überweisung (bis 14 Tage vorher)</option>
            <option value="bar">Bar bei Lieferung</option>
          </select>
        </label>
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

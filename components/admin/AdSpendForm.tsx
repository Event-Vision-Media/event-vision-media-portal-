"use client";

import { useState, useTransition } from "react";
import { saveAdSpend } from "@/app/actions/admin-ads";
import { formatCurrencyEUR } from "@/lib/format";

/** Werbekosten je Monat eintragen (aus Google Ads → Kampagnen → Kosten). */
export function AdSpendForm({ spend }: { spend: Record<string, number> }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const [month, setMonth] = useState(months[0]);
  const [amount, setAmount] = useState(spend[months[0]] != null ? String(spend[months[0]]) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = (m: string) => new Date(m + "-15").toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3 text-sm">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveAdSpend(month, amount);
            setMsg(r.error ?? "Gespeichert.");
          });
        }}
      >
        <label>
          <span className="mb-1 block text-xs text-anthracite-500">Monat</span>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setAmount(spend[e.target.value] != null ? String(spend[e.target.value]) : "");
              setMsg(null);
            }}
            className="input-field"
          >
            {months.map((m) => <option key={m} value={m}>{label(m)}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs text-anthracite-500">Werbekosten (€)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input-field w-32" placeholder="z. B. 210" />
        </label>
        <button disabled={pending} className="rounded-lg bg-anthracite-800 px-4 py-2.5 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
          {pending ? "Speichert…" : "Speichern"}
        </button>
        {msg && <span className="text-xs text-anthracite-500">{msg}</span>}
      </form>
      {Object.keys(spend).length > 0 && (
        <p className="text-xs text-anthracite-400">
          Hinterlegt: {Object.entries(spend).sort().reverse().map(([m, v]) => `${label(m)}: ${formatCurrencyEUR(v)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

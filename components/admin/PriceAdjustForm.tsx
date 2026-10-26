"use client";

import { useState, useTransition } from "react";
import { updatePriceAdjustment } from "@/app/actions/logistics";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** Admin: Sonderpreis vereinbaren – neuer Gesamtpreis, die Differenz erscheint als „Nachlass“-Zeile. */
export function PriceAdjustForm({
  bookingId,
  total,
  adjustment,
  locked,
}: {
  bookingId: string;
  total: number | null;
  adjustment: { label: string; amount: number } | null;
  locked: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const normal = total != null ? total - (adjustment?.amount ?? 0) : null;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-anthracite-700">
        {normal != null && <>Normalpreis {eur(normal)}</>}
        {adjustment && (
          <>
            {" "}· {adjustment.label} <strong>{eur(adjustment.amount)}</strong> → <strong>{eur(total ?? 0)}</strong>
          </>
        )}
      </p>
      {locked ? (
        <p className="text-xs text-anthracite-400">Vertrag unterschrieben – Preis ist fix.</p>
      ) : (
        <form
          action={(fd) =>
            start(async () => {
              const r = await updatePriceAdjustment(bookingId, fd);
              setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Gespeichert – steht so in Bestätigung, Portal und Vertrag." });
            })
          }
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-anthracite-500">Neuer Gesamtpreis (€)</span>
            <input name="target" inputMode="decimal" defaultValue={adjustment && total != null ? String(total) : ""} placeholder={normal != null ? String(normal) : ""} className="input-field w-32" />
          </label>
          <label className="block flex-1 min-w-[12rem]">
            <span className="mb-1 block text-xs text-anthracite-500">Bezeichnung (sieht der Kunde)</span>
            <input name="label" defaultValue={adjustment?.label ?? "Nachlass (persönlich vereinbart)"} maxLength={80} className="input-field" />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-anthracite-800 px-4 py-2.5 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
            {pending ? "Speichert…" : "Übernehmen"}
          </button>
          <p className="w-full text-xs text-anthracite-400">Feld leer lassen und übernehmen = wieder Normalpreis.</p>
          {msg && <p className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateLogistics } from "@/app/actions/logistics";
import { PICKUP_OPTIONS } from "@/lib/catalog";

/** Admin: Entfernung und Abholzeit korrigieren – Preise werden neu berechnet. */
export function LogisticsForm({ bookingId, km, pickup, locked }: { bookingId: string; km: number | null; pickup: string | null; locked: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (locked) {
    return <p className="text-xs text-anthracite-400">Vertrag unterschrieben – Anfahrt und Abholung sind fix.</p>;
  }
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await updateLogistics(bookingId, fd);
          setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Gespeichert – Preis neu berechnet." });
        })
      }
      className="flex flex-wrap items-end gap-3 text-sm"
    >
      <label className="block">
        <span className="mb-1 block text-xs text-anthracite-500">Entfernung (km, einfach)</span>
        <input name="km" type="number" min={0} step={1} defaultValue={km ?? ""} placeholder="unbekannt" className="input-field w-32" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-anthracite-500">Abholung</span>
        <select name="pickup" defaultValue={pickup ?? ""} className="input-field">
          <option value="">offen</option>
          {PICKUP_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}{o.price ? ` (+${o.price} €)` : ""}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-anthracite-800 px-4 py-2.5 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
        {pending ? "Speichert…" : "Übernehmen"}
      </button>
      {msg && <p className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}

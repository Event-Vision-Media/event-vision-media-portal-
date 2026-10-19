"use client";

import { useState } from "react";
import { TIME_OPTIONS, type Slot } from "@/lib/slots";

/** Datum + Zeitfenster (von/bis) als feste Auswahl. */
export function SlotPicker({
  name,
  label,
  initial,
  range,
  hint,
  hours,
}: {
  name: "handover" | "return";
  label: string;
  initial: Slot;
  range: [string, string];
  hint?: string;
  /** Nur Zeiten in diesem Rahmen anbieten (z. B. Selbstabholung 09:00–19:00). */
  hours?: [string, string];
}) {
  const options = hours ? TIME_OPTIONS.filter((t) => t >= hours[0] && t <= hours[1]) : TIME_OPTIONS;
  // Vorab geplante Zeiten außerhalb des Rahmens bleiben wählbar.
  const fromOptions = [...new Set([...options.slice(0, -1), initial.from])].sort();
  const toOptions = [...new Set([...options, initial.to])].sort();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  return (
    <fieldset className="rounded-xl border border-anthracite-100 bg-white p-3">
      <legend className="px-1 text-sm font-medium text-anthracite-600">
        {label} <span className="text-gold-600">*</span>
      </legend>
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-anthracite-400">Datum</span>
          <input type="date" name={`${name}_date`} defaultValue={initial.date} min={range[0]} max={range[1]} required className="input-field px-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-anthracite-400">von</span>
          <select
            name={`${name}_from`}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (to <= e.target.value) setTo(toOptions[Math.min(toOptions.indexOf(e.target.value) + 4, toOptions.length - 1)]);
            }}
            className="input-field px-2"
          >
            {fromOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-anthracite-400">bis</span>
          <select name={`${name}_to`} value={to} onChange={(e) => setTo(e.target.value)} className="input-field px-2">
            {toOptions.filter((t) => t > from).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      {hint && <p className="mt-2 text-xs text-anthracite-400">{hint}</p>}
    </fieldset>
  );
}

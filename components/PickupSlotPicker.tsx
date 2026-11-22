"use client";

import { useMemo, useState } from "react";
import { PICKUP_SLOT_STARTS, pickupSlotEnd, slotsOverlap, type Slot } from "@/lib/slots";

/**
 * Selbstabholung/Rückgabe bei uns: Datum + fester 1-Stunden-Termin.
 * Schon vergebene Stunden (andere Kunden) sind ausgegraut.
 */
export function PickupSlotPicker({
  name,
  label,
  initial,
  range,
  busy,
  hint,
}: {
  name: "handover" | "return";
  label: string;
  initial: Slot;
  range: [string, string];
  busy: Slot[];
  hint?: string;
}) {
  // Vorab von uns geplante Zeit (z. B. 17:30) bleibt wählbar, auch wenn sie nicht im Raster liegt
  const planned = !PICKUP_SLOT_STARTS.includes(initial.from) || initial.to !== pickupSlotEnd(initial.from) ? initial : null;
  const [date, setDate] = useState(initial.date);
  const taken = (from: string, to: string) => busy.some((b) => slotsOverlap(b, { date, from, to }));
  const options = useMemo(() => {
    const list = PICKUP_SLOT_STARTS.map((f) => ({ from: f, to: pickupSlotEnd(f) }));
    if (planned && planned.date === date && !list.some((o) => o.from === planned.from)) list.push({ from: planned.from, to: planned.to });
    return list.sort((a, b) => a.from.localeCompare(b.from));
  }, [date, planned]);
  // Nächstgelegene freie Stunde zur Wunschzeit (statt einfach die erste des Tages)
  const firstFree = (d: string) => {
    const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    return [...options]
      .sort((a, b) => Math.abs(mins(a.from) - mins(initial.from)) - Math.abs(mins(b.from) - mins(initial.from)))
      .find((o) => !busy.some((x) => slotsOverlap(x, { date: d, from: o.from, to: o.to })));
  };
  const [from, setFrom] = useState(() => (taken(initial.from, initial.to) ? firstFree(initial.date)?.from ?? initial.from : initial.from));
  const sel = options.find((o) => o.from === from) ?? options[0];
  const allTaken = options.every((o) => taken(o.from, o.to));

  return (
    <fieldset className="rounded-xl border border-anthracite-100 bg-white p-3">
      <legend className="px-1 text-sm font-medium text-anthracite-600">
        {label} <span className="text-gold-600">*</span>
      </legend>
      <input type="hidden" name={`${name}_from`} value={sel.from} />
      <input type="hidden" name={`${name}_to`} value={sel.to} />
      <label className="block">
        <span className="mb-1 block text-xs text-anthracite-400">Datum</span>
        <input
          type="date"
          name={`${name}_date`}
          value={date}
          min={range[0]}
          max={range[1]}
          required
          onChange={(e) => {
            const d = e.target.value;
            setDate(d);
            const still = options.find((o) => o.from === from);
            if (still && busy.some((b) => slotsOverlap(b, { date: d, from: still.from, to: still.to }))) setFrom(firstFree(d)?.from ?? from);
          }}
          className="input-field px-2"
        />
      </label>
      <p className="mb-1.5 mt-3 text-xs text-anthracite-400">Uhrzeit (1 Stunde)</p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label={`${label}: Uhrzeit`}>
        {options.map((o) => {
          const busyHere = taken(o.from, o.to);
          const active = o.from === sel.from;
          return (
            <button
              key={o.from}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busyHere}
              onClick={() => setFrom(o.from)}
              className={`rounded-lg border px-1 py-2 text-[13px] font-medium tabular-nums transition ${
                active
                  ? "border-anthracite-800 bg-anthracite-800 text-white"
                  : busyHere
                    ? "cursor-not-allowed border-anthracite-100 bg-anthracite-50 text-anthracite-300 line-through"
                    : "border-anthracite-200 bg-white text-anthracite-700 hover:border-gold-400"
              }`}
              title={busyHere ? "Schon vergeben" : undefined}
            >
              {o.from}–{o.to}
            </button>
          );
        })}
      </div>
      {allTaken && <p className="mt-2 text-xs text-red-700">An diesem Tag ist alles vergeben – bitte ein anderes Datum wählen oder kurz bei uns melden.</p>}
      {hint && <p className="mt-2 text-xs text-anthracite-400">{hint}</p>}
    </fieldset>
  );
}

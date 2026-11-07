"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { WHEEL_MAX, WHEEL_MIN } from "@/components/visionbooth/wheel";

interface Result {
  success?: boolean;
  error?: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:from-gold-500 hover:to-gold-700 disabled:opacity-60">
      {pending ? "Speichert …" : "Glücksrad speichern"}
    </button>
  );
}

/** Foto-Glücksrad ein-/ausschalten und die Aufgaben auf dem Rad anpassen. */
export function VbWheelEditor({ action, initial, defaults }: { action: (p: Result, f: FormData) => Promise<Result>; initial: { enabled: boolean; items: string[] }; defaults: string[] }) {
  const [state, formAction] = useActionState(action, {});
  const [on, setOn] = useState(initial.enabled);
  const [items, setItems] = useState<string[]>(initial.items.length ? initial.items : defaults);
  const filled = items.filter((x) => x.trim()).length;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="wheel_items" value={JSON.stringify(items)} />
      <label className="flex items-start gap-3 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
        <input type="checkbox" name="wheel_enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4" />
        <span className="text-sm text-anthracite-700">
          <strong className="block text-anthracite-800">Foto-Glücksrad für eure Gäste</strong>
          Gäste drehen am Rad und bekommen eine lustige Foto-Aufgabe – spontan, ohne Punkte.
        </span>
      </label>
      {on && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-anthracite-700">
            Aufgaben auf dem Rad <span className="font-normal text-anthracite-400">({WHEEL_MIN}–{WHEEL_MAX})</span>
          </p>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 flex-none text-right text-xs font-semibold text-anthracite-400">{i + 1}</span>
              <input
                value={it}
                maxLength={90}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
                className="input-field flex-1 text-sm"
                placeholder="z. B. Alle machen ein Herz mit den Händen"
              />
              {items.length > WHEEL_MIN && (
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="px-2 text-anthracite-400 hover:text-anthracite-700" aria-label="Aufgabe entfernen">
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-4 pt-1 text-xs font-medium">
            {items.length < WHEEL_MAX && (
              <button type="button" onClick={() => setItems([...items, ""])} className="text-gold-700 hover:text-gold-800">
                + Aufgabe hinzufügen
              </button>
            )}
            <button type="button" onClick={() => setItems(defaults)} className="text-anthracite-500 hover:text-anthracite-800">
              Unsere Vorschläge wiederherstellen
            </button>
          </div>
          {filled < WHEEL_MIN && <p className="text-xs text-red-600">Bitte mindestens {WHEEL_MIN} Aufgaben eintragen.</p>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.success && <span className="text-sm text-emerald-700">Gespeichert ✓</span>}
        {state.error && <span className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}

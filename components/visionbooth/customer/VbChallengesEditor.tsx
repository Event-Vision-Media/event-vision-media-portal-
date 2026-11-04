"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CHALLENGE_POINTS, CHALLENGE_SETS, MAX_CHALLENGES, type Challenge } from "@/components/visionbooth/challenges";

interface Result {
  success?: boolean;
  error?: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-anthracite-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-anthracite-700 disabled:opacity-60">
      {pending ? "Speichert …" : "Missionen speichern"}
    </button>
  );
}

const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Foto-Missionen festlegen: Vorlage je Anlass wählen, Texte/Punkte anpassen, eigene ergänzen. */
export function VbChallengesEditor({
  action,
  initial,
  galleryEnabled,
}: {
  action: (prev: Result, fd: FormData) => Promise<Result>;
  initial: Challenge[];
  galleryEnabled: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [list, setList] = useState<Challenge[]>(initial);
  const [enabled, setEnabled] = useState(initial.length > 0);

  const update = (id: string, patch: Partial<Challenge>) => setList((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const usePreset = (items: Challenge[]) => {
    setList(items.map((c) => ({ ...c })));
    setEnabled(true);
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="challenges" value={JSON.stringify(enabled ? list.filter((c) => c.text.trim()) : [])} />

      <label className="flex items-start gap-3 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4" />
        <span className="text-sm text-anthracite-700">
          <strong className="block text-anthracite-800">Foto-Missionen für die Gäste</strong>
          Kleine Foto-Aufgaben mit Punkten – die Besten erscheinen live auf der Foto-Wand. Bringt Gäste zusammen und sorgt für viel mehr Fotos.
        </span>
      </label>

      {enabled && !galleryEnabled && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Missionen brauchen die Galerie (Punkte zählen nur für geteilte Fotos). Bitte oben unter „Teilen“ die Galerie einschalten.
        </p>
      )}

      {enabled && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-anthracite-800">Vorlage übernehmen</p>
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_SETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => usePreset(s.items)}
                  className="rounded-full border border-anthracite-200 bg-white px-4 py-2 text-sm font-medium text-anthracite-800 transition hover:border-gold-400 active:scale-95"
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-anthracite-400">Ersetzt die Liste unten – danach könnt ihr alles anpassen.</p>
          </div>

          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="flex items-stretch gap-2 rounded-2xl border border-anthracite-100 bg-white p-2">
                <input
                  value={c.emoji}
                  onChange={(e) => update(c.id, { emoji: e.target.value })}
                  maxLength={8}
                  aria-label="Emoji"
                  className="h-12 w-12 flex-none self-center rounded-xl border border-anthracite-100 bg-sand-50 text-center text-xl"
                />
                <textarea
                  value={c.text}
                  onChange={(e) => update(c.id, { text: e.target.value.replace(/\n/g, " ") })}
                  maxLength={80}
                  rows={2}
                  placeholder="z. B. Foto mit der Oma"
                  aria-label="Aufgabe"
                  className="min-w-0 flex-1 resize-none rounded-xl border border-transparent px-2 py-1.5 text-sm leading-snug text-anthracite-800 focus:border-anthracite-200 focus:outline-none"
                />
                <div className="flex flex-none flex-col items-center justify-center gap-1">
                  <select
                    value={c.points}
                    onChange={(e) => update(c.id, { points: Number(e.target.value) })}
                    aria-label="Punkte"
                    className="h-9 rounded-lg border border-anthracite-100 bg-sand-50 px-1.5 text-sm font-semibold text-anthracite-800"
                  >
                    {CHALLENGE_POINTS.map((p) => (
                      <option key={p} value={p}>
                        +{p}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setList((l) => l.filter((x) => x.id !== c.id))}
                    aria-label="Mission entfernen"
                    className="h-7 rounded-lg px-2 text-xs text-anthracite-400 hover:bg-red-50 hover:text-red-600"
                  >
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="text-sm text-anthracite-500">Noch keine Missionen – wählt oben eine Vorlage oder legt eigene an.</p>}
          {list.length < MAX_CHALLENGES && (
            <button
              type="button"
              onClick={() => setList((l) => [...l, { id: newId(), emoji: "🎯", text: "", points: 20 }])}
              className="rounded-full border border-dashed border-anthracite-300 px-4 py-2 text-sm font-medium text-anthracite-700 hover:border-gold-400"
            >
              + Eigene Mission
            </button>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.success && <p className="text-sm font-medium text-emerald-700">Gespeichert ✓ – die Gäste sehen die Missionen sofort.</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

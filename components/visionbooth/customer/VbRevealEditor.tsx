"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { RevealConfig } from "@/components/visionbooth/reveal";

interface Result {
  success?: boolean;
  error?: string;
}

function Btn({ intent, children, className, confirmText, style }: { intent: string; children: React.ReactNode; className: string; confirmText?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className={`${className} disabled:opacity-60`}
      style={style}
    >
      {children}
    </button>
  );
}

/** Tippspiel (Gender Reveal): einschalten, Texte/Farben, Live-Stand und der Auflösen-Knopf. */
export function VbRevealEditor({ action, initial, counts }: { action: (p: Result, f: FormData) => Promise<Result>; initial: RevealConfig; counts: { a: number; b: number } }) {
  const [state, formAction] = useActionState(action, {});
  const [on, setOn] = useState(initial.enabled);
  const total = counts.a + counts.b;
  const share = total ? Math.round((counts.a / total) * 100) : 50;
  const result = initial.options.find((o) => o.id === initial.result);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
        <input type="checkbox" name="reveal_enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4" />
        <span className="text-sm text-anthracite-700">
          <strong className="block text-anthracite-800">Tippspiel / Gender Reveal</strong>
          Gäste tippen vor dem Foto – ihre Fotos bekommen die Farbe ihres Tipps, die Foto-Wand zeigt den Live-Stand. Ihr löst per Knopfdruck auf.
        </span>
      </label>

      {on && (
        <>
          <input name="reveal_question" defaultValue={initial.question} maxLength={80} className="input-field" aria-label="Frage an die Gäste" />
          <div className="grid gap-3 sm:grid-cols-2">
            {initial.options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2 rounded-2xl border border-anthracite-100 p-2">
                <input name={`reveal_emoji_${i}`} defaultValue={o.emoji} maxLength={8} className="h-11 w-12 rounded-xl border border-anthracite-100 bg-sand-50 text-center text-xl" aria-label="Emoji" />
                <input name={`reveal_label_${i}`} defaultValue={o.label} maxLength={20} className="min-w-0 flex-1 rounded-xl px-2 py-2.5 text-sm" aria-label="Bezeichnung" />
                <input type="color" name={`reveal_color_${i}`} defaultValue={o.color} className="h-11 w-12 cursor-pointer rounded-xl border border-anthracite-100" aria-label="Farbe" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-sand-50 p-4">
            <p className="text-sm font-semibold text-anthracite-800">Live-Stand · {total} {total === 1 ? "Tipp" : "Tipps"}</p>
            <div className="mt-2 flex h-7 overflow-hidden rounded-full text-xs font-bold text-white">
              <span className="flex items-center pl-3" style={{ width: `${Math.max(14, Math.min(86, share))}%`, background: initial.options[0].color }}>
                {initial.options[0].emoji} {counts.a}
              </span>
              <span className="flex flex-1 items-center justify-end pr-3" style={{ background: initial.options[1].color }}>
                {counts.b} {initial.options[1].emoji}
              </span>
            </div>
          </div>

          {result ? (
            <div className="rounded-2xl p-4 text-white" style={{ background: result.color }}>
              <p className="font-semibold">
                {result.emoji} Aufgelöst: Es wird ein {result.label}!
              </p>
              <Btn intent="reset" confirmText="Auflösung wirklich zurücknehmen?" className="mt-2 text-xs underline">
                Auflösung zurücknehmen
              </Btn>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-anthracite-200 p-4">
              <p className="text-sm font-semibold text-anthracite-800">🎉 Der große Moment</p>
              <p className="mt-0.5 text-xs text-anthracite-500">Erst drücken, wenn alle gespannt vor der Foto-Wand stehen – die Auflösung erscheint sofort auf Wand und allen Handys.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {initial.options.map((o) => (
                  <Btn key={o.id} intent={`reveal_${o.id}`} confirmText={`Jetzt auflösen: Es wird ein ${o.label}?`} className="rounded-full py-3 text-sm font-bold text-white shadow-md" style={{ background: o.color }}>
                    {o.emoji} Es wird ein {o.label}
                  </Btn>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Btn intent="save" className="rounded-full bg-anthracite-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-anthracite-700">
          Tippspiel speichern
        </Btn>
        {state.success && <p className="text-sm font-medium text-emerald-700">Gespeichert ✓</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

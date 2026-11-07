"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

interface Result {
  success?: boolean;
  error?: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-anthracite-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-anthracite-700 disabled:opacity-60">
      {pending ? "Speichert …" : "Speichern"}
    </button>
  );
}

/** Gästebuch-Grüße ein-/ausschalten, neueste Grüße zeigen, Gästebuch öffnen. */
export function VbGuestbookEditor({
  action,
  enabled,
  galleryEnabled,
  greetings,
  total,
  bookUrl,
}: {
  action: (p: Result, f: FormData) => Promise<Result>;
  enabled: boolean;
  galleryEnabled: boolean;
  greetings: { id: string; text: string; name: string | null; thumb: string }[];
  total: number;
  bookUrl: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [on, setOn] = useState(enabled);
  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <label className="flex items-start gap-3 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
          <input type="checkbox" name="guestbook_enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4" />
          <span className="text-sm text-anthracite-700">
            <strong className="block text-anthracite-800">Gästebuch-Grüße</strong>
            Nach dem Foto können Gäste einen kurzen Gruß dazu schreiben.
            {!galleryEnabled && <span className="mt-1 block text-amber-700">Dafür muss oben unter „Gestalten“ die Galerie eingeschaltet sein.</span>}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Submit />
          {state.success && <span className="text-sm text-emerald-700">Gespeichert ✓</span>}
          {state.error && <span className="text-sm text-red-700">{state.error}</span>}
        </div>
      </form>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-anthracite-800">{total ? `${total} ${total === 1 ? "Gruß" : "Grüße"} bisher` : "Noch keine Grüße"}</p>
          {total > 0 && (
            <a href={bookUrl} target="_blank" className="rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow">
              Gästebuch öffnen &amp; drucken
            </a>
          )}
        </div>
        {greetings.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {greetings.map((g) => (
              <li key={g.id} className="flex gap-3 rounded-2xl border border-anthracite-100 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.thumb && <img src={g.thumb} alt="" className="h-16 w-16 flex-none rounded-xl object-cover" />}
                <span className="min-w-0 text-sm text-anthracite-700">
                  „{g.text}“
                  {g.name && <span className="mt-1 block text-xs font-semibold text-anthracite-500">– {g.name}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

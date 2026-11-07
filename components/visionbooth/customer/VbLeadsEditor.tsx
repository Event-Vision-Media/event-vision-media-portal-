"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LEAD_FIELDS, type LeadConfig } from "@/components/visionbooth/leads";

interface Result {
  success?: boolean;
  error?: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:from-gold-500 hover:to-gold-700 disabled:opacity-60">
      {pending ? "Speichert …" : "Kontaktformular speichern"}
    </button>
  );
}

/** Freiwilliges Kontaktformular (Gewinnspiel/Newsletter) einstellen + Kontakte als CSV. */
export function VbLeadsEditor({ action, initial, count, csvUrl }: { action: (p: Result, f: FormData) => Promise<Result>; initial: LeadConfig; count: number; csvUrl: string }) {
  const [state, formAction] = useActionState(action, {});
  const [on, setOn] = useState(initial.enabled);
  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
        <input type="checkbox" name="lead_enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4" />
        <span className="text-sm text-anthracite-700">
          <strong className="block text-anthracite-800">Kontaktformular für Gäste</strong>
          Nach dem Foto lädt eine Karte zum Mitmachen ein (z. B. Gewinnspiel). Freiwillig – das Foto gibt es immer.
        </span>
      </label>
      {on && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Überschrift">
            <input name="lead_title" defaultValue={initial.title} maxLength={70} className="input-field" />
          </Field>
          <Field label="Text darunter (z. B. der Preis)">
            <input name="lead_text" defaultValue={initial.text} maxLength={200} className="input-field" placeholder="z. B. Gewinne ein Wellness-Wochenende" />
          </Field>
          <Field label="Wer erhält die Daten? (Firma)">
            <input name="lead_sponsor" defaultValue={initial.sponsor} maxLength={80} className="input-field" placeholder="z. B. Muster GmbH" />
          </Field>
          <Field label="Wofür werden sie genutzt?">
            <input name="lead_purpose" defaultValue={initial.purpose} maxLength={160} className="input-field" />
          </Field>
          <Field label="Link zu Teilnahmebedingungen / Datenschutz (empfohlen)">
            <input name="lead_privacy_url" type="url" defaultValue={initial.privacyUrl} maxLength={300} className="input-field" placeholder="https://www.eure-firma.de/gewinnspiel" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-anthracite-700 sm:col-span-2">
            <input type="checkbox" name="lead_marketing" defaultChecked={initial.marketing} className="mt-1 h-4 w-4" />
            <span>
              Zusätzlich ein <strong>getrenntes, freiwilliges</strong> Häkchen für E-Mail-Werbung anbieten
              <span className="block text-xs text-anthracite-400">Werbung nur an Gäste, die dieses Häkchen setzen – das Gewinnspiel ist davon unabhängig (so verlangt es das Wettbewerbsrecht).</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-4 text-sm text-anthracite-700 sm:col-span-2">
            {LEAD_FIELDS.map((f) => (
              <label key={f.id} className="flex items-center gap-2">
                <input type="checkbox" name={`lead_field_${f.id}`} defaultChecked={initial.fields.includes(f.id) || f.id === "email"} disabled={f.id === "email"} /> {f.label}
              </label>
            ))}
            <input type="hidden" name="lead_field_email" value="on" />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {count > 0 && (
          <a href={csvUrl} className="rounded-full border border-anthracite-200 px-4 py-2.5 text-sm font-medium text-anthracite-800 hover:border-gold-400">
            {count} Kontakte als CSV ↓
          </a>
        )}
        {state.success && <p className="text-sm font-medium text-emerald-700">Gespeichert ✓</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-anthracite-600">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { VbDesignPicker } from "@/components/admin/visionbooth/VbDesignPicker";
import { getTemplate } from "@/components/visionbooth/templates";
import type { VbCustomerResult } from "@/app/actions/vb-customer";

interface Values {
  template: string;
  frameText: string;
  subtext: string;
  accent: string;
  logoUrl: string | null;
  formats: string[];
  galleryEnabled: boolean;
  guestUploads: boolean;
  wallEnabled: boolean;
  occasion?: string | null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-anthracite-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-anthracite-700 disabled:opacity-60">
      {pending ? "Speichert …" : "Design speichern"}
    </button>
  );
}

const label = "mb-1.5 block text-sm font-medium text-anthracite-600";

/** Design der VisionBooth im Kundenbereich – Vorlage, Texte, Farbe, Logo, Formate. */
export function VbCustomerDesignForm({ action, initial }: { action: (prev: VbCustomerResult, fd: FormData) => Promise<VbCustomerResult>; initial: Values }) {
  const [state, formAction] = useActionState(action, {});
  const [template, setTemplate] = useState(initial.template);
  const [frameText, setFrameText] = useState(initial.frameText);
  const [subtext, setSubtext] = useState(initial.subtext);
  const [accent, setAccent] = useState(initial.accent);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logoUrl);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="template" value={template} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="c-title">Titel – z. B. eure Namen oder der Firmenname</label>
          <input id="c-title" name="frame_text" maxLength={60} value={frameText} onChange={(e) => setFrameText(e.target.value)} className="input-field" placeholder="Anna & Max" />
        </div>
        <div>
          <label className={label} htmlFor="c-sub">Unterzeile (optional)</label>
          <input id="c-sub" name="frame_subtext" maxLength={60} value={subtext} onChange={(e) => setSubtext(e.target.value)} className="input-field" placeholder="14.11.2026 · Schloss Hugenpoet" />
        </div>
        <div>
          <label className={label} htmlFor="c-accent">{getTemplate(template).art ? "Textfarbe" : "Akzentfarbe"}</label>
          <div className="flex gap-2">
            <input id="c-accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-11 w-14 flex-none cursor-pointer rounded-lg border border-anthracite-200" />
            <input name="accent_color" value={accent} onChange={(e) => setAccent(e.target.value)} className="input-field font-mono" maxLength={7} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="c-logo">Logo (optional · PNG mit transparentem Hintergrund ideal)</label>
          {getTemplate(template).art && (
            <p className="-mt-1 mb-2 text-xs text-anthracite-500">
              Bei gestalteten Designs erscheint das Logo klein oben rechts im Foto. Für einen großen Logo-Auftritt passt ein schlichtes Design wie „Corporate“ besser.
            </p>
          )}
          {initial.logoUrl && (
            <label className="mb-1.5 flex items-center gap-2 text-xs text-anthracite-500">
              <input type="checkbox" name="remove_logo" onChange={(e) => setLogoPreview(e.target.checked ? null : initial.logoUrl)} /> Aktuelles Logo entfernen
            </label>
          )}
          <input
            id="c-logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setLogoPreview(f ? URL.createObjectURL(f) : initial.logoUrl);
            }}
            className="block w-full text-sm text-anthracite-600"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-anthracite-800">Vorlage wählen</p>
        <VbDesignPicker
          template={template}
          onTemplate={(id, a) => {
            setTemplate(id);
            setAccent(a);
          }}
          text={frameText}
          subtext={subtext}
          accent={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#c4933f"}
          logoUrl={logoPreview}
          occasion={initial.occasion}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-anthracite-100 bg-white p-4">
          <p className="text-sm font-semibold text-anthracite-800">Bildformate für eure Gäste</p>
          <div className="mt-2 space-y-2 text-sm text-anthracite-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="formats" value="einzel" defaultChecked={initial.formats.includes("einzel")} /> Einzelfoto
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="formats" value="streifen" defaultChecked={initial.formats.includes("streifen")} /> Fotostreifen (3 Fotos)
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-anthracite-100 bg-white p-4">
          <p className="text-sm font-semibold text-anthracite-800">Teilen</p>
          <div className="mt-2 space-y-2 text-sm text-anthracite-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="gallery_enabled" defaultChecked={initial.galleryEnabled} /> Gäste dürfen Fotos in die Galerie stellen
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="guest_uploads" defaultChecked={initial.guestUploads} className="mt-1" />
              <span>
                Gäste dürfen eigene Handy-Fotos hochladen
                <span className="block text-xs text-anthracite-400">Beim Kindergeburtstag empfehlen wir: aus</span>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="wall_enabled" defaultChecked={initial.wallEnabled} /> Foto-Wand für Beamer/TV
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.success && <p className="text-sm font-medium text-emerald-700">Gespeichert ✓ – eure Gäste sehen das neue Design sofort.</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

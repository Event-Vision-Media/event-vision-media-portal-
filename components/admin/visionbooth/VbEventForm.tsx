"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateVbEvent } from "@/app/actions/admin-visionbooth";
import type { AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

interface EventValues {
  id: string;
  title: string;
  eventDate: string;
  package: string;
  status: string;
  contactName: string;
  contactEmail: string;
  frameText: string;
  frameStyle: string;
  accent: string;
  logoUrl: string | null;
  opensDate: string;
  closesDate: string;
  aiEnabled: boolean;
  aiStyles: string[];
  aiLimit: number;
  aiPerGuest: number;
  wallEnabled: boolean;
  galleryEnabled: boolean;
}

const initial: AdminActionResult = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Speichert …" : "Speichern"}
    </Button>
  );
}

const label = "mb-1.5 block text-sm font-medium text-anthracite-600";
const section = "border-t border-anthracite-100 pt-5";

export function VbEventForm({ event: e, styles }: { event: EventValues; styles: { key: string; label: string; emoji: string }[] }) {
  const [state, action] = useFormState(updateVbEvent, initial);
  const [aiOn, setAiOn] = useState(e.aiEnabled);
  const [accent, setAccent] = useState(e.accent);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={e.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="f-title">Name des Events</label>
          <input id="f-title" name="title" defaultValue={e.title} required className="input-field" />
        </div>
        <div>
          <label className={label} htmlFor="f-date">Datum</label>
          <input id="f-date" name="event_date" type="date" defaultValue={e.eventDate} className="input-field" />
        </div>
        <div>
          <label className={label} htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={e.status} className="input-field">
            <option value="aktiv">Aktiv</option>
            <option value="entwurf">Entwurf (Gäste-Link gesperrt)</option>
            <option value="beendet">Beendet</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="f-package">Paket</label>
          <select id="f-package" name="package" defaultValue={e.package} className="input-field">
            <option value="privat">Privat</option>
            <option value="business">Business</option>
            <option value="addon">Add-on zur Buchung</option>
          </select>
        </div>
        <div />
        <div>
          <label className={label} htmlFor="f-cname">Kunde</label>
          <input id="f-cname" name="contact_name" defaultValue={e.contactName} className="input-field" />
        </div>
        <div>
          <label className={label} htmlFor="f-cmail">E-Mail</label>
          <input id="f-cmail" name="contact_email" type="email" defaultValue={e.contactEmail} className="input-field" />
        </div>
      </div>

      <div className={section}>
        <p className="text-sm font-semibold text-anthracite-800">Gäste-Link aktiv</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="f-open">ab (00:00 Uhr)</label>
            <input id="f-open" name="opens_date" type="date" defaultValue={e.opensDate} className="input-field" />
          </div>
          <div>
            <label className={label} htmlFor="f-close">bis (23:59 Uhr)</label>
            <input id="f-close" name="closes_date" type="date" defaultValue={e.closesDate} className="input-field" />
          </div>
        </div>
        <p className="mt-1 text-xs text-anthracite-400">Leer = ohne Begrenzung.</p>
      </div>

      <div className={section}>
        <p className="text-sm font-semibold text-anthracite-800">Rahmen</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="f-frame">Text im Rahmen</label>
            <input id="f-frame" name="frame_text" maxLength={60} defaultValue={e.frameText} className="input-field" />
          </div>
          <div>
            <label className={label} htmlFor="f-style">Stil</label>
            <select id="f-style" name="frame_style" defaultValue={e.frameStyle} className="input-field">
              <option value="gold">Schwarz mit Akzentfarbe</option>
              <option value="schwarz">Schwarz-Weiß</option>
              <option value="weiss">Hell (Creme)</option>
              <option value="ohne">Ohne Rahmen (Text unten im Bild)</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="f-accent">Akzentfarbe</label>
            <div className="flex gap-2">
              <input id="f-accent" type="color" value={accent} onChange={(ev) => setAccent(ev.target.value)} className="h-11 w-14 flex-none cursor-pointer rounded-lg border border-anthracite-200" />
              <input name="accent_color" value={accent} onChange={(ev) => setAccent(ev.target.value)} className="input-field font-mono" maxLength={7} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="f-logo">Logo (optional, PNG mit transparentem Hintergrund ideal)</label>
            {e.logoUrl && (
              <div className="mb-2 flex items-center gap-3">
                <img src={e.logoUrl} alt="" className="h-12 max-w-[160px] rounded bg-anthracite-900 object-contain p-1" />
                <label className="flex items-center gap-2 text-xs text-anthracite-500">
                  <input type="checkbox" name="remove_logo" /> Logo entfernen
                </label>
              </div>
            )}
            <input id="f-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm text-anthracite-600" />
          </div>
        </div>
      </div>

      <div className={section}>
        <label className="flex items-center gap-2 text-sm font-semibold text-anthracite-800">
          <input type="checkbox" name="ai_enabled" checked={aiOn} onChange={(ev) => setAiOn(ev.target.checked)} className="h-4 w-4" />
          KI-Stile anbieten
        </label>
        {aiOn && (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {styles.map((s) => (
                <label key={s.key} className="flex items-center gap-2 rounded-lg border border-anthracite-100 bg-white px-2.5 py-2 text-sm text-anthracite-700">
                  <input type="checkbox" name="ai_styles" value={s.key} defaultChecked={e.aiStyles.includes(s.key)} />
                  <span>{s.emoji} {s.label}</span>
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="f-limit">KI-Bilder fürs ganze Event</label>
                <input id="f-limit" name="ai_limit" type="number" min={0} max={5000} defaultValue={e.aiLimit} className="input-field" />
                <p className="mt-1 text-xs text-anthracite-400">je Bild ca. 0,08 $ Kosten</p>
              </div>
              <div>
                <label className={label} htmlFor="f-per">pro Gast (Gerät)</label>
                <input id="f-per" name="ai_per_guest" type="number" min={1} max={20} defaultValue={e.aiPerGuest} className="input-field" />
              </div>
            </div>
          </div>
        )}
        {!aiOn && (
          <>
            {e.aiStyles.map((k) => <input key={k} type="hidden" name="ai_styles" value={k} />)}
            <input type="hidden" name="ai_limit" value={e.aiLimit} />
            <input type="hidden" name="ai_per_guest" value={e.aiPerGuest} />
          </>
        )}
      </div>

      <div className={`${section} space-y-2`}>
        <label className="flex items-center gap-2 text-sm text-anthracite-700">
          <input type="checkbox" name="gallery_enabled" defaultChecked={e.galleryEnabled} className="h-4 w-4" />
          Galerie: Gäste können zustimmen, dass ihre Fotos gespeichert werden
        </label>
        <label className="flex items-center gap-2 text-sm text-anthracite-700">
          <input type="checkbox" name="wall_enabled" defaultChecked={e.wallEnabled} className="h-4 w-4" />
          Foto-Wand (Beamer/TV) verfügbar
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Submit />
        {state.success && <p className="text-sm text-emerald-700">Gespeichert ✓</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

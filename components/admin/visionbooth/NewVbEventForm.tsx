"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createVbEvent } from "@/app/actions/admin-visionbooth";
import type { AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

const initial: AdminActionResult = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Wird angelegt …" : "Event anlegen"}
    </Button>
  );
}

export function NewVbEventForm() {
  const [state, action] = useFormState(createVbEvent, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="vb-title" className="mb-2 block text-sm font-medium text-anthracite-600">Name des Events</label>
        <input id="vb-title" name="title" required className="input-field" placeholder="z. B. Hochzeit Anna & Max" />
      </div>
      <div>
        <label htmlFor="vb-frame" className="mb-2 block text-sm font-medium text-anthracite-600">Text im Rahmen</label>
        <input id="vb-frame" name="frame_text" maxLength={60} className="input-field" placeholder="z. B. Anna & Max · 14.11.2026" />
        <p className="mt-1 text-xs text-anthracite-400">Leer = Name des Events.</p>
      </div>
      <div>
        <label htmlFor="vb-date" className="mb-2 block text-sm font-medium text-anthracite-600">Datum</label>
        <input id="vb-date" name="event_date" type="date" className="input-field" />
        <p className="mt-1 text-xs text-anthracite-400">Gäste-Link ist dann ab dem Event-Tag 14 Tage aktiv (änderbar).</p>
      </div>
      <div>
        <label htmlFor="vb-package" className="mb-2 block text-sm font-medium text-anthracite-600">Paket</label>
        <select id="vb-package" name="package" className="input-field" defaultValue="privat">
          <option value="privat">Privat (ohne KI)</option>
          <option value="business">Business (KI, 300 Bilder)</option>
          <option value="addon">Add-on zur Fotobox/Spiegel (KI, 150 Bilder)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="vb-cname" className="mb-2 block text-sm font-medium text-anthracite-600">Kunde</label>
          <input id="vb-cname" name="contact_name" className="input-field" />
        </div>
        <div>
          <label htmlFor="vb-cmail" className="mb-2 block text-sm font-medium text-anthracite-600">E-Mail</label>
          <input id="vb-cmail" name="contact_email" type="email" className="input-field" />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit />
    </form>
  );
}

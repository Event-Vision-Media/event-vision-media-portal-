"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createAppointment } from "@/app/actions/admin-appointments";
import type { AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

/** Formular „Eigener Termin“ – z. B. nur Zubehör vermietet, Wartung, Besorgung. */
export function AppointmentForm({ extras, defaultDate }: { extras: { id: string; name: string }[]; defaultDate: string }) {
  const [state, formAction] = useActionState(createAppointment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Nach dem Speichern leeren, damit der nächste Termin direkt eingetragen werden kann
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-medium text-anthracite-600">
          Was steht an?
        </label>
        <input id="title" name="title" required maxLength={120} placeholder="z. B. Fotokabine – Max Muster (holt selbst ab)" className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="date" className="mb-2 block text-sm font-medium text-anthracite-600">
            Datum
          </label>
          <input id="date" name="date" type="date" required defaultValue={defaultDate} className="input-field" />
        </div>
        <div>
          <label htmlFor="time" className="mb-2 block text-sm font-medium text-anthracite-600">
            Uhrzeit <span className="font-normal text-anthracite-400">(optional)</span>
          </label>
          <input id="time" name="time" type="time" className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="return_date" className="mb-2 block text-sm font-medium text-anthracite-600">
            Rückgabe / Ende <span className="font-normal text-anthracite-400">(optional)</span>
          </label>
          <input id="return_date" name="return_date" type="date" className="input-field" />
        </div>
        <div>
          <label htmlFor="return_time" className="mb-2 block text-sm font-medium text-anthracite-600">
            Uhrzeit <span className="font-normal text-anthracite-400">(optional)</span>
          </label>
          <input id="return_time" name="return_time" type="time" className="input-field" />
        </div>
      </div>

      <div>
        <label htmlFor="note" className="mb-2 block text-sm font-medium text-anthracite-600">
          Vorbereitung / Notiz <span className="font-normal text-anthracite-400">(optional, steht im Wochenplan)</span>
        </label>
        <textarea id="note" name="note" rows={3} maxLength={1000} placeholder={"z. B. Gebläse, Heringe und Verlängerung bereitlegen\nKaution 100 € bar"} className="input-field" />
      </div>

      {extras.length > 0 && (
        <div>
          <label htmlFor="block_extra" className="mb-2 block text-sm font-medium text-anthracite-600">
            Extra für den Zeitraum sperren <span className="font-normal text-anthracite-400">(optional)</span>
          </label>
          <select id="block_extra" name="block_extra" defaultValue="" className="input-field">
            <option value="">Nichts sperren</option>
            {extras.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-anthracite-400">Dann kann es in dieser Zeit nicht als Extra auf der Website oder im Portal gebucht werden.</p>
        </div>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Termin gespeichert – er steht jetzt im Kalender und im Wochenplan.</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Speichert…" : "Termin eintragen"}
    </Button>
  );
}

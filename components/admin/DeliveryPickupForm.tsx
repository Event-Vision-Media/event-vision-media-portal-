"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateDeliveryPickupInfo,
  type AdminActionResult,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import type { Booking } from "@/lib/types";

const initialState: AdminActionResult = {};

export function DeliveryPickupForm({ booking }: { booking: Booking }) {
  const boundAction = updateDeliveryPickupInfo.bind(null, booking.id);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <fieldset className="space-y-3 rounded-xl border border-anthracite-100 p-4">
          <legend className="px-1 text-sm font-semibold text-anthracite-700">Lieferung</legend>
          <div>
            <label htmlFor="delivery_date" className="mb-1 block text-xs font-medium text-anthracite-600">
              Datum
            </label>
            <input
              id="delivery_date"
              name="delivery_date"
              type="date"
              defaultValue={booking.delivery_date ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label htmlFor="delivery_time" className="mb-1 block text-xs font-medium text-anthracite-600">
              Uhrzeit
            </label>
            <input
              id="delivery_time"
              name="delivery_time"
              type="time"
              defaultValue={booking.delivery_time ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label htmlFor="delivery_time_window" className="mb-1 block text-xs font-medium text-anthracite-600">
              Zeitfenster (optional)
            </label>
            <input
              id="delivery_time_window"
              name="delivery_time_window"
              type="text"
              placeholder="z. B. 14:00–15:00 Uhr"
              defaultValue={booking.delivery_time_window ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="delivery_contact_name"
              className="mb-1 block text-xs font-medium text-anthracite-600"
            >
              Ansprechpartner Name
            </label>
            <input
              id="delivery_contact_name"
              name="delivery_contact_name"
              type="text"
              defaultValue={booking.delivery_contact_name ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="delivery_contact_phone"
              className="mb-1 block text-xs font-medium text-anthracite-600"
            >
              Ansprechpartner Telefon
            </label>
            <input
              id="delivery_contact_phone"
              name="delivery_contact_phone"
              type="tel"
              defaultValue={booking.delivery_contact_phone ?? ""}
              className="input-field text-sm"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-anthracite-100 p-4">
          <legend className="px-1 text-sm font-semibold text-anthracite-700">Abholung</legend>
          <div>
            <label htmlFor="pickup_date" className="mb-1 block text-xs font-medium text-anthracite-600">
              Datum
            </label>
            <input
              id="pickup_date"
              name="pickup_date"
              type="date"
              defaultValue={booking.pickup_date ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label htmlFor="pickup_time" className="mb-1 block text-xs font-medium text-anthracite-600">
              Uhrzeit
            </label>
            <input
              id="pickup_time"
              name="pickup_time"
              type="time"
              defaultValue={booking.pickup_time ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label htmlFor="pickup_time_window" className="mb-1 block text-xs font-medium text-anthracite-600">
              Zeitfenster (optional)
            </label>
            <input
              id="pickup_time_window"
              name="pickup_time_window"
              type="text"
              placeholder="z. B. 23:00–23:30 Uhr"
              defaultValue={booking.pickup_time_window ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="pickup_contact_name"
              className="mb-1 block text-xs font-medium text-anthracite-600"
            >
              Ansprechpartner Name
            </label>
            <input
              id="pickup_contact_name"
              name="pickup_contact_name"
              type="text"
              defaultValue={booking.pickup_contact_name ?? ""}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="pickup_contact_phone"
              className="mb-1 block text-xs font-medium text-anthracite-600"
            >
              Ansprechpartner Telefon
            </label>
            <input
              id="pickup_contact_phone"
              name="pickup_contact_phone"
              type="tel"
              defaultValue={booking.pickup_contact_phone ?? ""}
              className="input-field text-sm"
            />
          </div>
        </fieldset>
      </div>

      <div>
        <label htmlFor="access_notes" className="mb-1 block text-sm font-medium text-anthracite-600">
          Besonderheiten zur Lieferung / Zugangshinweise
        </label>
        <textarea
          id="access_notes"
          name="access_notes"
          rows={3}
          defaultValue={booking.access_notes ?? ""}
          placeholder="Vom Kunden hinterlegt oder hier direkt bearbeitbar."
          className="input-field text-sm"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Gespeichert.</p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Speichert…" : "Speichern"}
    </Button>
  );
}

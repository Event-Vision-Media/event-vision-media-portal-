"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createAvailabilityBlock,
  type AdminActionResult,
} from "@/app/actions/admin-availability";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

export function NewAvailabilityBlockForm({
  options,
  defaultDate,
}: {
  options: { value: string; label: string; group: string }[];
  defaultDate: string;
}) {
  const [state, formAction] = useFormState(createAvailabilityBlock, initialState);

  const groups = Array.from(new Set(options.map((o) => o.group)));

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="target" className="mb-2 block text-sm font-medium text-anthracite-600">
          Produkt
        </label>
        <select id="target" name="target" className="input-field" required defaultValue="">
          <option value="" disabled>
            Produkt auswählen…
          </option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((o) => o.group === group)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="start_date" className="mb-2 block text-sm font-medium text-anthracite-600">
            Von
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultDate}
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-2 block text-sm font-medium text-anthracite-600">
            Bis
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultDate}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="blocked_quantity"
          className="mb-2 block text-sm font-medium text-anthracite-600"
        >
          Menge
        </label>
        <input
          id="blocked_quantity"
          name="blocked_quantity"
          type="number"
          min="1"
          defaultValue={1}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="note" className="mb-2 block text-sm font-medium text-anthracite-600">
          Interne Notiz (optional)
        </label>
        <textarea id="note" name="note" rows={2} className="input-field" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Blockierung wurde gespeichert.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Speichert…" : "Blockieren"}
    </Button>
  );
}

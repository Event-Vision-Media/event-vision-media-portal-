"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createExtra, type AdminActionResult } from "@/app/actions/admin-extras";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

export function NewExtraForm() {
  const [state, formAction] = useFormState(createExtra, initialState);
  const [hasVariants, setHasVariants] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-anthracite-600">
          Name des Extras
        </label>
        <input id="name" name="name" type="text" className="input-field" required />
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-medium text-anthracite-600">
          Kategorie
        </label>
        <input
          id="category"
          name="category"
          type="text"
          defaultValue="Exclusive Extras"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-anthracite-600">
          Kurze Beschreibung
        </label>
        <textarea id="description" name="description" rows={2} className="input-field" />
      </div>

      <div>
        <label htmlFor="image" className="mb-2 block text-sm font-medium text-anthracite-600">
          Vorschaubild
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-anthracite-600 file:mr-4 file:rounded-lg file:border-0 file:bg-anthracite-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-anthracite-600">
        <input
          type="checkbox"
          name="has_variants"
          checked={hasVariants}
          onChange={(e) => setHasVariants(e.target.checked)}
          className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
        />
        Hat mehrere auswählbare Varianten (z. B. Hintergründe)
      </label>

      {!hasVariants && (
        <div>
          <label htmlFor="price" className="mb-2 block text-sm font-medium text-anthracite-600">
            Preis (€)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={0}
            className="input-field"
          />
        </div>
      )}

      <div>
        <label htmlFor="sort_order" className="mb-2 block text-sm font-medium text-anthracite-600">
          Sortierung (kleiner = weiter vorne)
        </label>
        <input id="sort_order" name="sort_order" type="number" defaultValue={0} className="input-field" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Extra wurde angelegt.
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
      {pending ? "Wird angelegt…" : "Extra hinzufügen"}
    </Button>
  );
}

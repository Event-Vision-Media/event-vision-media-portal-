"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createLayout, type AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { LAYOUT_CATEGORIES } from "@/lib/types";

const initialState: AdminActionResult = {};

export function NewLayoutForm() {
  const [state, formAction] = useFormState(createLayout, initialState);
  const [isPremium, setIsPremium] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-anthracite-600">
          Name des Layouts
        </label>
        <input id="name" name="name" type="text" className="input-field" required />
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
        <p className="mt-1 text-xs text-anthracite-400">
          Alternativ Bild-URL angeben:
        </p>
        <input
          name="preview_image_url"
          type="url"
          placeholder="https://…"
          className="input-field mt-1"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-anthracite-600">
        <input
          type="checkbox"
          name="is_premium"
          checked={isPremium}
          onChange={(e) => setIsPremium(e.target.checked)}
          className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
        />
        Premium-Layout
      </label>

      {isPremium && (
        <div>
          <label htmlFor="extra_price" className="mb-2 block text-sm font-medium text-anthracite-600">
            Zusatzpreis (€)
          </label>
          <input
            id="extra_price"
            name="extra_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={25}
            className="input-field"
          />
        </div>
      )}

      {isPremium && (
        <div>
          <label htmlFor="category" className="mb-2 block text-sm font-medium text-anthracite-600">
            Kategorie
          </label>
          <select id="category" name="category" className="input-field" defaultValue="">
            <option value="">Keine Kategorie</option>
            {LAYOUT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="sort_order" className="mb-2 block text-sm font-medium text-anthracite-600">
          Sortierung (kleiner = weiter vorne)
        </label>
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={0}
          className="input-field"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Layout wurde angelegt.
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
      {pending ? "Wird hochgeladen…" : "Layout hinzufügen"}
    </Button>
  );
}

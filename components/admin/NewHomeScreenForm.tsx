"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createHomeScreen, type AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { PRODUCT_TYPES, getHomeScreenAspect } from "@/lib/types";

const initialState: AdminActionResult = {};

export function NewHomeScreenForm() {
  const [state, formAction] = useFormState(createHomeScreen, initialState);
  const [productType, setProductType] = useState<string>(PRODUCT_TYPES[0]);
  const aspect = getHomeScreenAspect(productType);

  return (
    <form action={formAction} className="space-y-4" key={state.success ? "done" : "form"}>
      <div>
        <label htmlFor="product_type" className="mb-2 block text-sm font-medium text-anthracite-600">
          Produkt
        </label>
        <select
          id="product_type"
          name="product_type"
          className="input-field"
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          required
        >
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-anthracite-600">
          Name des Startbildschirms
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
          required
          className="block w-full text-sm text-anthracite-600 file:mr-4 file:rounded-lg file:border-0 file:bg-anthracite-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
        />
        {aspect.label && (
          <p className="mt-1 text-xs text-anthracite-400">
            Empfohlenes Format für {productType}: {aspect.label} Pixel
          </p>
        )}
      </div>

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
          Startbildschirm wurde angelegt.
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
      {pending ? "Wird hochgeladen…" : "Startbildschirm hinzufügen"}
    </Button>
  );
}

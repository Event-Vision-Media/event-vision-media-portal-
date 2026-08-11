"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createVariant, type AdminActionResult } from "@/app/actions/admin-extras";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

export function NewVariantForm({ extraId }: { extraId: string }) {
  const boundAction = createVariant.bind(null, extraId);
  const [state, formAction] = useFormState(boundAction, initialState);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-gold-700 hover:text-gold-800"
      >
        + Variante hinzufügen
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-anthracite-100 p-3">
      <input name="name" type="text" placeholder="Name der Variante" className="input-field text-sm" required />
      <textarea name="description" placeholder="Kurzer Beschreibungstext" rows={2} className="input-field text-sm" />
      <textarea
        name="features"
        placeholder={"Enthaltene Leistungen, eine pro Zeile"}
        rows={4}
        className="input-field text-sm"
      />
      <div className="flex gap-2">
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={0}
          placeholder="Preis"
          className="input-field text-sm"
        />
        <input
          name="sort_order"
          type="number"
          defaultValue={0}
          placeholder="Sortierung"
          className="input-field text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-anthracite-600">
        <input
          type="checkbox"
          name="is_popular"
          className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
        />
        Als &quot;Beliebt&quot; hervorheben
      </label>
      <input
        name="image"
        type="file"
        accept="image/*"
        className="block w-full text-xs text-anthracite-600 file:mr-3 file:rounded-md file:border-0 file:bg-anthracite-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs font-medium text-anthracite-400 hover:text-anthracite-700"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
      {pending ? "Speichert…" : "Hinzufügen"}
    </Button>
  );
}

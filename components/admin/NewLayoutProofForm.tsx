"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadLayoutProof, type AdminActionResult } from "@/app/actions/admin-layout-proofs";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

export function NewLayoutProofForm({
  bookingId,
  existingLayoutNames,
}: {
  bookingId: string;
  existingLayoutNames: string[];
}) {
  const boundAction = uploadLayoutProof.bind(null, bookingId);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="layout_name" className="mb-2 block text-sm font-medium text-anthracite-600">
          Layoutname
        </label>
        <input
          id="layout_name"
          name="layout_name"
          type="text"
          list="existing-layout-names"
          placeholder="z. B. Hauptdesign Fotobox"
          className="input-field"
          required
        />
        <datalist id="existing-layout-names">
          {existingLayoutNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-anthracite-400">
          Bestehenden Namen eingeben, um eine neue Version hochzuladen.
        </p>
      </div>

      <div>
        <label htmlFor="file" className="mb-2 block text-sm font-medium text-anthracite-600">
          Datei (Bild oder PDF)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          className="block w-full text-sm text-anthracite-600 file:mr-4 file:rounded-lg file:border-0 file:bg-anthracite-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
          required
        />
      </div>

      <div>
        <label htmlFor="admin_notes" className="mb-2 block text-sm font-medium text-anthracite-600">
          Interne Notiz (nur für dich sichtbar)
        </label>
        <textarea id="admin_notes" name="admin_notes" rows={2} className="input-field" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Layout wurde hochgeladen.
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
      {pending ? "Lädt hoch…" : "Layout hochladen"}
    </Button>
  );
}

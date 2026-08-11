"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  uploadPersonalizedScreenProof,
  type AdminActionResult,
} from "@/app/actions/admin-personalized-screen";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionResult = {};

export function NewPersonalizedScreenProofForm({ bookingId }: { bookingId: string }) {
  const boundAction = uploadPersonalizedScreenProof.bind(null, bookingId);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="file" className="mb-2 block text-sm font-medium text-anthracite-600">
          Startbildschirm-Entwurf (Bild)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/*"
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
          Entwurf wurde hochgeladen.
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
      {pending ? "Lädt hoch…" : "Entwurf hochladen"}
    </Button>
  );
}

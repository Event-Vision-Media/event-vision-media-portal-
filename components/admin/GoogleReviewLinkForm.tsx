"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateGoogleReviewUrl } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import type { AdminActionResult } from "@/app/actions/admin";

const initialState: AdminActionResult = {};

export function GoogleReviewLinkForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction] = useFormState(updateGoogleReviewUrl, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="url" className="mb-2 block text-sm font-medium text-anthracite-600">
          Google-Bewertungslink
        </label>
        <input
          id="url"
          name="url"
          type="text"
          defaultValue={currentUrl ?? ""}
          placeholder="https://g.page/r/…/review"
          className="input-field"
        />
        <p className="mt-1 text-xs text-anthracite-400">
          Findet ihr im Google-Unternehmensprofil unter „Rezension erhalten“ – gilt für alle
          Buchungen gleichermaßen.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Link gespeichert.
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
      {pending ? "Speichert…" : "Speichern"}
    </Button>
  );
}

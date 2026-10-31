"use client";

import { useState, useTransition } from "react";
import { deleteVbEvent } from "@/app/actions/admin-visionbooth";

/** Event inkl. aller Fotos endgültig löschen – mit Sicherheitsabfrage. */
export function VbDeleteButton({ eventId, title }: { eventId: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-center">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`„${title}“ mit allen Fotos endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
          start(async () => {
            const r = await deleteVbEvent(eventId);
            if (r?.error) setError(r.error);
          });
        }}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Wird gelöscht …" : "Event mit allen Fotos löschen"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

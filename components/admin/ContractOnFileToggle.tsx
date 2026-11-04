"use client";

import { useState, useTransition } from "react";
import { setContractOnFile } from "@/app/actions/admin-inquiries";

/** Vermerk „Mietvertrag liegt bereits vor“ (Bestandsbuchung) setzen/entfernen. */
export function ContractOnFileToggle({ bookingId, onFile }: { bookingId: string; onFile: boolean }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await setContractOnFile(bookingId, !onFile);
            setError(r.error ?? null);
          })
        }
        className="text-sm font-medium text-gold-700 hover:text-gold-800 disabled:opacity-50"
      >
        {busy ? "Speichert …" : onFile ? "Doch digital unterschreiben lassen" : "Vertrag liegt bereits vor (Papier/PDF) – vermerken"}
      </button>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

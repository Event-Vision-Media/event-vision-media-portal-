"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomLoginCode } from "@/app/actions/admin";

export function CustomLoginCodeCell({
  bookingId,
  code,
}: {
  bookingId: string;
  code: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(code ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateCustomLoginCode(bookingId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setDraft(code ?? "");
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="w-36 space-y-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="z. B. Andrea08.08"
          autoFocus
          className="w-full rounded border border-anthracite-200 px-2 py-1 text-xs text-anthracite-800 focus:border-gold-500 focus:outline-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="font-medium text-emerald-600 hover:text-emerald-800"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={cancel}
            className="font-medium text-anthracite-400 hover:text-anthracite-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className={code ? "font-medium text-anthracite-700" : "text-anthracite-400"}>
        {code ?? "Kein Passwort"}
      </p>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="font-medium text-anthracite-500 hover:underline"
      >
        {code ? "Bearbeiten" : "Passwort hinzufügen"}
      </button>
    </div>
  );
}

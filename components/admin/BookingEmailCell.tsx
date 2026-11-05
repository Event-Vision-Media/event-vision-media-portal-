"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingEmail } from "@/app/actions/admin";

/** E-Mail-Adresse des Kunden anzeigen und korrigieren. */
export function BookingEmailCell({ bookingId, email }: { bookingId: string; email: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(email ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingEmail(bookingId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      setSaved(true);
      router.refresh();
    });
  }

  function cancel() {
    setDraft(email ?? "");
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="max-w-xs space-y-1.5">
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="name@beispiel.de"
          autoFocus
          className="w-full rounded border border-anthracite-200 px-2 py-1 text-xs text-anthracite-800 focus:border-gold-500 focus:outline-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={save} disabled={isPending} className="font-medium text-emerald-600 hover:text-emerald-800">
            {isPending ? "Speichert …" : "Speichern"}
          </button>
          <button type="button" onClick={cancel} className="font-medium text-anthracite-400 hover:text-anthracite-700">
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className={`break-all ${email ? "font-medium text-anthracite-700" : "text-anthracite-400"}`}>{email ?? "Keine E-Mail-Adresse"}</p>
      <button type="button" onClick={() => setIsEditing(true)} className="font-medium text-anthracite-500 hover:underline">
        {email ? "Ändern" : "E-Mail hinzufügen"}
      </button>
      {saved && <p className="mt-1 text-emerald-700">Gespeichert ✓ – Mail ggf. unten über „Portal-Zugang erneut senden“ neu schicken.</p>}
    </div>
  );
}

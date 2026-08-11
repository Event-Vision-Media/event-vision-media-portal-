"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminNotes } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

export function AdminNotesEditor({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes: string | null;
}) {
  const [draft, setDraft] = useState(notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateAdminNotes(bookingId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder="Nur für euch intern sichtbar, z. B. Absprachen, Besonderheiten, Erinnerungen …"
        className="input-field"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <Button
        variant="secondary"
        className="mt-3"
        disabled={isPending || draft === (notes ?? "")}
        onClick={save}
      >
        {isPending ? "Speichert…" : "Notiz speichern"}
      </Button>
    </div>
  );
}

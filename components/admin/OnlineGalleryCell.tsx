"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOnlineGalleryUrl } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { formatDateTimeGerman } from "@/lib/format";

export function OnlineGalleryCell({
  bookingId,
  url,
  clickedAt,
}: {
  bookingId: string;
  url: string | null;
  clickedAt: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState(url ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateOnlineGalleryUrl(bookingId, urlDraft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setUrlDraft(url ?? "");
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="w-48 space-y-1.5">
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="https://…"
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
    <div className="space-y-1 text-xs">
      {url ? (
        <>
          <Badge tone={clickedAt ? "success" : "neutral"}>
            {clickedAt ? "Geöffnet" : "Noch nicht geöffnet"}
          </Badge>
          {clickedAt && (
            <p className="text-anthracite-400">zuletzt am {formatDateTimeGerman(clickedAt)} Uhr</p>
          )}
        </>
      ) : (
        <Badge tone="neutral">Kein Link</Badge>
      )}
      <div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="font-medium text-anthracite-600 hover:underline"
        >
          {url ? "Bearbeiten" : "Link hinzufügen"}
        </button>
      </div>
    </div>
  );
}

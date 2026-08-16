"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecording } from "@/app/actions/admin-audio-guestbook";

export function DeleteRecordingButton({
  recordingId,
  bookingId,
}: {
  recordingId: string;
  bookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Diese Aufnahme wirklich löschen?")) return;
    startTransition(async () => {
      await deleteRecording(recordingId, bookingId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="flex-none text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "…" : "Löschen"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventUploaded } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";

export function EventUploadedToggle({
  bookingId,
  uploaded,
}: {
  bookingId: string;
  uploaded: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await updateEventUploaded(bookingId, !uploaded);
      router.refresh();
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={uploaded}
        onChange={toggle}
        disabled={isPending}
        className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
      />
      {uploaded ? (
        <Badge tone="success">Hochgeladen</Badge>
      ) : (
        <span className="text-anthracite-400">Noch nicht hochgeladen</span>
      )}
    </label>
  );
}

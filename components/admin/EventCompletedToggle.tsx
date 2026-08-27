"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventCompleted } from "@/app/actions/admin";

export function EventCompletedToggle({
  bookingId,
  completed,
  label,
}: {
  bookingId: string;
  completed: boolean;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await updateEventCompleted(bookingId, !completed);
      router.refresh();
    });
  }

  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-xs"
      title="Veranstaltung abgeschlossen"
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={toggle}
        disabled={isPending}
        className="h-4 w-4 rounded border-anthracite-300 text-emerald-600 focus:ring-emerald-400"
      />
      {label && (
        <span className={completed ? "font-medium text-emerald-700" : "text-anthracite-400"}>
          {label}
        </span>
      )}
    </label>
  );
}

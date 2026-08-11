"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAvailabilityBlock } from "@/app/actions/admin-availability";
import { formatDateGerman } from "@/lib/format";

export function AvailabilityBlockListItem({
  blockId,
  productName,
  startDate,
  endDate,
  blockedQuantity,
  note,
}: {
  blockId: string;
  productName: string;
  startDate: string;
  endDate: string;
  blockedQuantity: number;
  note: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteAvailabilityBlock(blockId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-anthracite-100 bg-white px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-anthracite-800">{productName}</p>
        <p className="text-xs text-anthracite-400">
          {startDate === endDate
            ? formatDateGerman(startDate)
            : `${formatDateGerman(startDate)} – ${formatDateGerman(endDate)}`}{" "}
          · Menge: {blockedQuantity}
          {note && ` · ${note}`}
        </p>
      </div>
      {confirmingDelete ? (
        <span className="flex flex-none items-center gap-2 text-xs">
          <span className="text-anthracite-500">Freigeben?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="font-semibold text-emerald-600 hover:text-emerald-800"
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="font-medium text-anthracite-400 hover:text-anthracite-700"
          >
            Nein
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleDelete}
          className="flex-none text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
        >
          Freigeben
        </button>
      )}
    </div>
  );
}

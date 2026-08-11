"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBooking } from "@/app/actions/admin";

export function BookingRowActions({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Diese Buchung wirklich unwiderruflich löschen?")) return;
    startTransition(async () => {
      await deleteBooking(bookingId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "…" : "Löschen"}
    </button>
  );
}

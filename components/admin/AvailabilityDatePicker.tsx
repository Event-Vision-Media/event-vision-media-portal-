"use client";

import { useRouter } from "next/navigation";

export function AvailabilityDatePicker({ date }: { date: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={date}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/admin/verfuegbarkeit?date=${e.target.value}`);
        }
      }}
      className="input-field max-w-xs"
    />
  );
}

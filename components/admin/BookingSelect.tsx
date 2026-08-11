"use client";

import { useRouter } from "next/navigation";

interface BookingOption {
  id: string;
  booking_code: string;
  couple_names: string;
}

export function BookingSelect({
  bookings,
  selectedId,
  basePath = "/admin/layout-freigaben",
}: {
  bookings: BookingOption[];
  selectedId?: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `${basePath}?booking=${value}` : basePath);
      }}
      className="input-field max-w-sm"
    >
      <option value="">Kunde auswählen…</option>
      {bookings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.booking_code} · {b.couple_names}
        </option>
      ))}
    </select>
  );
}

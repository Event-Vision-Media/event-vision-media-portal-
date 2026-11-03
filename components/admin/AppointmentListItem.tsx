"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAppointment } from "@/app/actions/admin-appointments";
import { formatDateGerman } from "@/lib/format";
import type { Appointment } from "@/lib/calendar";

const when = (date: string, time: string | null) => `${formatDateGerman(date)}${time ? `, ${time.slice(0, 5)} Uhr` : ""}`;

export function AppointmentListItem({ a, blockedName }: { a: Appointment; blockedName: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleDelete() {
    if (!confirming) return setConfirming(true);
    startTransition(async () => {
      await deleteAppointment(a.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-anthracite-100 bg-white px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-anthracite-800">📌 {a.title}</p>
        <p className="text-xs text-anthracite-500">
          {when(a.date, a.time)}
          {a.return_date && ` → Rückgabe ${when(a.return_date, a.return_time)}`}
        </p>
        {a.note && <p className="mt-1 whitespace-pre-line text-xs text-anthracite-500">{a.note}</p>}
        {blockedName && <p className="mt-1 text-xs text-gold-700">🔒 {blockedName} gesperrt</p>}
      </div>
      {confirming ? (
        <span className="flex flex-none items-center gap-2 text-xs">
          <span className="text-anthracite-500">Löschen?</span>
          <button type="button" onClick={handleDelete} disabled={isPending} className="font-semibold text-red-600 hover:text-red-800">
            Ja
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="font-medium text-anthracite-400 hover:text-anthracite-700">
            Nein
          </button>
        </span>
      ) : (
        <button type="button" onClick={handleDelete} className="flex-none text-xs font-medium text-anthracite-500 hover:text-anthracite-800">
          Löschen
        </button>
      )}
    </div>
  );
}

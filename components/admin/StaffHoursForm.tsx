"use client";

import { useState, useTransition } from "react";
import { updateStaffHours } from "@/app/actions/logistics";
import { STAFF_INCLUDED_HOURS, STAFF_MAX_EXTRA_HOURS, staffLabel, type StaffInfo } from "@/lib/catalog";

/** Admin: Betreuungszeit ansehen und Stunden (inkl. Zusatzstunden) bestätigen – Preis wird neu berechnet. */
export function StaffHoursForm({ bookingId, staff, locked }: { bookingId: string; staff: StaffInfo; locked: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const wish = staff.hours + staff.requestedExtra;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-anthracite-700">👤 {staffLabel(staff)}</p>
      {staff.requestedExtra > 0 && (
        <p className="font-medium text-amber-700">Kunde wünscht {staff.requestedExtra} weitere Std. (insgesamt {wish} Std.) – bitte bestätigen</p>
      )}
      {locked ? (
        <p className="text-xs text-anthracite-400">Vertrag unterschrieben – Stunden sind fix. Zusatzstunden bitte separat abrechnen.</p>
      ) : (
        <form
          action={(fd) =>
            start(async () => {
              const r = await updateStaffHours(bookingId, fd);
              setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Gespeichert – Preis neu berechnet." });
            })
          }
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-anthracite-500">Betreuung insgesamt</span>
            <select name="hours" defaultValue={String(wish)} className="input-field">
              {Array.from({ length: STAFF_MAX_EXTRA_HOURS + 1 }, (_, i) => STAFF_INCLUDED_HOURS + i).map((h) => (
                <option key={h} value={h}>{h} Std.{h > STAFF_INCLUDED_HOURS ? ` (+${h - STAFF_INCLUDED_HOURS} Zusatzstd.)` : " (inklusive)"}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-anthracite-800 px-4 py-2.5 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
            {pending ? "Speichert…" : "Bestätigen"}
          </button>
          {msg && <p className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}

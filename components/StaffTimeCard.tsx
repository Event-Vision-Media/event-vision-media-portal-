"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStaffTime } from "@/app/actions/booking";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { STAFF_INCLUDED_HOURS, STAFF_MAX_EXTRA_HOURS, staffLabel, type StaffInfo } from "@/lib/catalog";

// Halbstündlich von 10:00 bis 23:30
const TIMES = Array.from({ length: 28 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/** Kunde legt fest, wann unser Personal vor Ort sein soll – und kann weitere Stunden anfragen. */
export function StaffTimeCard({ staff, sie, locked, extraHourPrice }: { staff: StaffInfo; sie: boolean; locked: boolean; extraHourPrice: number }) {
  const t = (ihr: string, s: string) => (sie ? s : ihr);
  const router = useRouter();
  const [editing, setEditing] = useState(!staff.start && !locked);
  const [start, setStart] = useState(staff.start ?? "19:00");
  const [extra, setExtra] = useState(staff.requestedExtra);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveStaffTime(start, extra);
      if (res.error) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <Card className="animate-fade-in-up">
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">Betreuung durch unser Personal</h2>
      <p className="mt-1 text-sm text-anthracite-500">
        {t(
          `Das Gerät ist während eurer gesamten Feier da. Unser Personal betreut es ${staff.hours} Stunden lang – sagt uns, ab wann.`,
          `Das Gerät ist während Ihrer gesamten Veranstaltung vor Ort. Unser Personal betreut es ${staff.hours} Stunden lang – legen Sie fest, ab wann.`
        )}
      </p>

      {!editing ? (
        <div className="mt-4 space-y-2">
          <p className="rounded-lg bg-anthracite-50 px-3 py-2.5 text-sm font-medium text-anthracite-800">
            👤 {staffLabel(staff)}
          </p>
          {staff.requestedExtra > 0 && (
            <p className="text-sm text-gold-700">
              {staff.requestedExtra} weitere Stunde{staff.requestedExtra > 1 ? "n" : ""} angefragt – wir bestätigen kurz.
            </p>
          )}
          {!locked && (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-anthracite-500 hover:text-anthracite-800">
              Ändern
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-anthracite-600">
              Beginn der Betreuung
              <select className="input-field mt-1" value={start} onChange={(e) => setStart(e.target.value)}>
                {TIMES.map((x) => (
                  <option key={x} value={x}>{x} Uhr</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-anthracite-600">
              Weitere Stunden (je {extraHourPrice} €)
              <select className="input-field mt-1" value={extra} onChange={(e) => setExtra(Number(e.target.value))}>
                {Array.from({ length: STAFF_MAX_EXTRA_HOURS + 1 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? `Keine – ${STAFF_INCLUDED_HOURS} Std. reichen` : `+ ${i} Std.`}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-anthracite-400">
            Ergebnis: {staffLabel({ ...staff, start, hours: staff.hours + extra })}
            {extra > 0 && t(" – die Zusatzstunden bestätigen wir euch noch.", " – die Zusatzstunden bestätigen wir Ihnen noch.")}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            {staff.start && (
              <Button variant="ghost" className="flex-1" disabled={isPending} onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            )}
            <Button className="flex-1" disabled={isPending} onClick={save}>
              {isPending ? "Speichern …" : "Speichern"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

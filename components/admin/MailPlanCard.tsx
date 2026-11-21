import { Card } from "@/components/ui/Card";
import { mailPlanFor } from "@/lib/mail-plan";
import type { Booking } from "@/lib/types";

const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

/** Geplante automatische Mails: was der Kunde voraussichtlich wann bekommt (höchstens eine pro Tag). */
export async function MailPlanCard({ booking }: { booking: Booking }) {
  const plan = await mailPlanFor(booking);
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">Geplante Mails</h2>
        <span className="text-xs text-anthracite-400">automatisch · höchstens 1 Mail pro Tag</span>
      </div>
      {plan.paused ? (
        <p className="mt-2 text-sm text-anthracite-500">{plan.paused}</p>
      ) : plan.items.length === 0 ? (
        <p className="mt-2 text-sm text-anthracite-500">Keine automatischen Mails mehr geplant.</p>
      ) : (
        <ul className="mt-3 divide-y divide-anthracite-100 text-sm">
          {plan.items.map((m, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <span className="w-32 flex-none tabular-nums text-anthracite-500">{fmt(m.date)}</span>
              <span className="font-medium text-anthracite-800">{m.label}</span>
              {m.fixed && <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-800">fester Termin</span>}
              {m.shifted && <span className="rounded-full bg-anthracite-100 px-2 py-0.5 text-[11px] text-anthracite-600">verschoben</span>}
              {m.note && <span className="w-full pl-0 text-xs text-anthracite-400 sm:pl-[8.75rem]">{m.note}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-anthracite-400">Voraussichtlich – entfällt automatisch, wenn der Kunde den Schritt vorher erledigt oder du die Zahlung abhakst.</p>
    </Card>
  );
}

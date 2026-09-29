import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingInfoPanel } from "@/components/admin/BookingInfoPanel";
import { Card } from "@/components/ui/Card";
import { daysUntil } from "@/lib/catalog";
import { formatCurrencyEUR } from "@/lib/format";
import { loadBookingInfos } from "@/lib/admin-booking-info";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES = {
  woche: { label: "Nächste 7 Tage", days: 7 },
  monat: { label: "Nächste 30 Tage", days: 30 },
  alle: { label: "Alle kommenden", days: 730 },
} as const;
type RangeKey = keyof typeof RANGES;

function weekday(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
}

/** Einsatz-Übersicht: alle kommenden Events mit Kontakt, Location, Logistik, Vertrag und Zahlung. */
export default async function AdminOverviewPage({ searchParams }: { searchParams: { zeitraum?: string } }) {
  const range: RangeKey = (searchParams.zeitraum as RangeKey) in RANGES ? (searchParams.zeitraum as RangeKey) : "monat";
  const supabase = createAdminClient();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const until = new Date(Date.now() + RANGES[range].days * 86_400_000).toISOString().slice(0, 10);

  const [{ data }, { count: openInquiries }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .in("lifecycle", ["reserviert", "bestaetigt"])
      .gte("event_date", today)
      .lte("event_date", until)
      .order("event_date", { ascending: true })
      .limit(80),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("lifecycle", ["anfrage", "reserviert"]),
  ]);

  const infos = await loadBookingInfos((data ?? []) as Booking[]);
  const thisWeek = infos.filter((i) => daysUntil(i.booking.event_date) <= 7).length;
  const openPayments = infos.reduce((sum, i) => {
    const p = i.payment;
    if (!p || p.total == null || i.booking.lifecycle !== "bestaetigt") return sum;
    return sum + (p.depositPaid ? 0 : p.deposit ?? 0) + (p.restPaid ? 0 : p.rest ?? 0);
  }, 0);
  const unsigned = infos.filter((i) => i.contractNeeded && !i.contract).length;
  const missingLogistics = infos.filter((i) => !i.booking.delivery_date && !i.contract?.handover).length;

  const byDate = new Map<string, typeof infos>();
  for (const i of infos) byDate.set(i.booking.event_date, [...(byDate.get(i.booking.event_date) ?? []), i]);

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Übersicht</h1>
        <p className="mt-1 text-sm text-anthracite-500">Alle kommenden Einsätze mit Kontakt, Location, Zeiten, Vertrag und Zahlung.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi href="/admin/anfragen" label="Offene Anfragen" value={String(openInquiries ?? 0)} alert={(openInquiries ?? 0) > 0} />
          <Kpi label="Events in 7 Tagen" value={String(thisWeek)} />
          <Kpi href="/admin/zahlungen" label="Offene Zahlungen" value={formatCurrencyEUR(openPayments)} />
          <Kpi href="/admin/anfragen?view=bestaetigt" label="Vertrag offen" value={String(unsigned)} alert={unsigned > 0} />
          <Kpi href="/admin/lieferung" label="Lieferzeit fehlt" value={String(missingLogistics)} alert={missingLogistics > 0} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/uebersicht?zeitraum=${k}`}
              className={`rounded-full border px-4 py-1.5 transition ${k === range ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"}`}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-8">
          {infos.length === 0 && <Card><p className="text-center text-sm text-anthracite-400">Keine Einsätze in diesem Zeitraum.</p></Card>}
          {Array.from(byDate.entries()).map(([date, list]) => {
            const d = daysUntil(date);
            return (
              <section key={date}>
                <h2 className="mb-3 flex items-baseline gap-3 font-serif text-lg font-semibold text-anthracite-800">
                  {weekday(date)}
                  <span className="font-sans text-sm font-normal text-anthracite-400">{d === 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`}</span>
                </h2>
                <div className="space-y-3">
                  {list.map((info) => (
                    <Card key={info.booking.id}>
                      <BookingInfoPanel info={info} />
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, href, alert }: { label: string; value: string; href?: string; alert?: boolean }) {
  const body = (
    <div className={`h-full rounded-2xl border bg-white p-4 shadow-sm transition ${alert ? "border-gold-300" : "border-anthracite-100"} ${href ? "hover:-translate-y-0.5 hover:shadow-card" : ""}`}>
      <p className="text-xs text-anthracite-500">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${alert ? "text-gold-700" : "text-anthracite-800"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

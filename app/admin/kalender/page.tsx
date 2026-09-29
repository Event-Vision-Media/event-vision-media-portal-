import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { addDays, loadCalendar, mondayOf, todayBerlin, type CalendarEntry, type CalendarKind } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const KIND: Record<CalendarKind, { icon: string; label: string; self: string; cls: string }> = {
  aufbau: { icon: "🚚", label: "Aufbau", self: "Übergabe", cls: "border-l-sky-500 bg-sky-50" },
  event: { icon: "🎉", label: "Event", self: "Event", cls: "border-l-gold-500 bg-gold-50" },
  abbau: { icon: "📦", label: "Abbau", self: "Rückgabe", cls: "border-l-violet-500 bg-violet-50" },
};

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { ...opts, timeZone: "Europe/Berlin" });
}

/** Kalender: Woche (Standard) oder Monat mit Aufbau, Event und Abbau. */
export default async function AdminCalendarPage({ searchParams }: { searchParams: { ansicht?: string; datum?: string } }) {
  const view = searchParams.ansicht === "monat" ? "monat" : "woche";
  const today = todayBerlin();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.datum ?? "") ? searchParams.datum! : today;

  let from: string, to: string, prev: string, next: string, heading: string;
  if (view === "woche") {
    from = mondayOf(anchor);
    to = addDays(from, 6);
    prev = addDays(from, -7);
    next = addDays(from, 7);
    const kw = isoWeek(from);
    heading = `KW ${kw} · ${fmt(from, { day: "numeric", month: "short" })} – ${fmt(to, { day: "numeric", month: "short", year: "numeric" })}`;
  } else {
    const first = anchor.slice(0, 8) + "01";
    from = mondayOf(first);
    const nextMonth = new Date(first + "T00:00:00Z");
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const nm = nextMonth.toISOString().slice(0, 10);
    to = addDays(mondayOf(addDays(nm, -1)), 6);
    const pm = new Date(first + "T00:00:00Z");
    pm.setUTCMonth(pm.getUTCMonth() - 1);
    prev = pm.toISOString().slice(0, 10);
    next = nm;
    heading = fmt(first, { month: "long", year: "numeric" });
  }

  const entries = await loadCalendar(from, to);
  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const month = anchor.slice(0, 7);
  const href = (datum: string, ansicht = view) => `/admin/kalender?ansicht=${ansicht}&datum=${datum}`;
  const counts = {
    aufbau: entries.filter((e) => e.kind === "aufbau").length,
    event: new Set(entries.filter((e) => e.kind === "event").map((e) => e.bookingId)).size,
    abbau: entries.filter((e) => e.kind === "abbau").length,
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Kalender</h1>
            <p className="mt-1 text-sm text-anthracite-500">{heading}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex overflow-hidden rounded-full border border-anthracite-200 bg-white">
              {(["woche", "monat"] as const).map((v) => (
                <Link key={v} href={href(anchor, v)} className={`px-4 py-1.5 ${v === view ? "bg-anthracite-800 text-white" : "text-anthracite-600 hover:bg-sand-50"}`}>
                  {v === "woche" ? "Woche" : "Monat"}
                </Link>
              ))}
            </div>
            <Link href={href(prev)} aria-label="Zurück" className="rounded-full border border-anthracite-200 bg-white px-3 py-1.5 text-anthracite-600 hover:border-gold-300">←</Link>
            <Link href={href(today)} className="rounded-full border border-anthracite-200 bg-white px-4 py-1.5 text-anthracite-600 hover:border-gold-300">Heute</Link>
            <Link href={href(next)} aria-label="Weiter" className="rounded-full border border-anthracite-200 bg-white px-3 py-1.5 text-anthracite-600 hover:border-gold-300">→</Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-anthracite-500">
          <span>🚚 {counts.aufbau} × Aufbau/Übergabe</span>
          <span>🎉 {counts.event} Events</span>
          <span>📦 {counts.abbau} × Abbau/Rückgabe</span>
          <span className="text-anthracite-400">Gestrichelt = vorgemerkt, noch nicht bestätigt</span>
        </div>

        {view === "woche" ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-7">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              return (
                <section key={d} className={`rounded-2xl border bg-white p-3 ${d === today ? "border-gold-400 ring-2 ring-gold-200" : "border-anthracite-100"}`}>
                  <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold text-anthracite-800">
                    <span>{fmt(d, { weekday: "long" })}</span>
                    <span className="font-normal text-anthracite-400">{fmt(d, { day: "numeric", month: "short" })}</span>
                  </h2>
                  {list.length === 0 ? (
                    <p className="py-2 text-xs text-anthracite-300">frei</p>
                  ) : (
                    <ul className="space-y-2">{list.map((e) => <Entry key={e.id} e={e} />)}</ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-anthracite-100 bg-white">
            <div className="hidden grid-cols-7 border-b border-anthracite-100 bg-sand-50 text-center text-xs font-semibold text-anthracite-500 md:grid">
              {WD.map((w) => <div key={w} className="py-2">{w}</div>)}
            </div>
            <div className="grid md:grid-cols-7">
              {days.map((d) => {
                const list = byDay.get(d) ?? [];
                const other = d.slice(0, 7) !== month;
                if (other && list.length === 0) return <div key={d} className="hidden min-h-[110px] border-b border-r border-anthracite-50 bg-sand-50/50 md:block" />;
                return (
                  <div key={d} className={`min-h-[110px] border-b border-r border-anthracite-50 p-2 ${other ? "bg-sand-50/50" : ""} ${list.length === 0 ? "hidden md:block" : ""}`}>
                    <Link href={href(d, "woche")} className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${d === today ? "bg-gold-600 text-white" : "text-anthracite-600 hover:bg-sand-100"}`}>
                      <span className="md:hidden">{fmt(d, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="hidden md:inline">{Number(d.slice(8))}</span>
                    </Link>
                    <ul className="space-y-1">
                      {list.map((e) => (
                        <li key={e.id}>
                          <Link href={`/admin/bookings/${e.bookingId}`} className={`block truncate rounded-md border-l-4 px-1.5 py-0.5 text-[11px] leading-snug text-anthracite-700 hover:brightness-95 ${KIND[e.kind].cls} ${e.lifecycle !== "bestaetigt" ? "border-dashed opacity-80" : ""}`} title={`${e.title} · ${e.devices}${e.place ? ` · ${e.place}` : ""}`}>
                            {KIND[e.kind].icon} {e.sort && e.kind !== "event" && e.sort !== "99:98" ? `${e.sort} ` : ""}{e.title.split(" · ")[0]}
                            {e.warnings.length > 0 && " ⚠️"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {entries.length === 0 && <p className="mt-6 text-center text-sm text-anthracite-400">In diesem Zeitraum ist nichts gebucht.</p>}
      </main>
    </div>
  );
}

function Entry({ e }: { e: CalendarEntry }) {
  const k = KIND[e.kind];
  return (
    <li>
      <Link
        href={`/admin/bookings/${e.bookingId}`}
        className={`block rounded-lg border-l-4 px-2.5 py-2 text-xs transition hover:brightness-95 ${k.cls} ${e.lifecycle !== "bestaetigt" ? "border border-dashed border-anthracite-200" : ""}`}
      >
        <p className="font-semibold text-anthracite-800">
          {k.icon} {e.selfService ? k.self : k.label}
          {e.timeLabel ? (
            <span className="font-normal text-anthracite-600"> · {e.timeLabel}</span>
          ) : e.kind !== "event" ? (
            <span className="font-normal text-amber-700"> · Zeit offen</span>
          ) : null}
        </p>
        <p className="mt-0.5 font-medium text-anthracite-700">{e.title}</p>
        <p className="text-anthracite-500">{e.devices}</p>
        {e.place && <p className="text-anthracite-500">📍 {e.place}</p>}
        {e.lifecycle !== "bestaetigt" && <p className="mt-0.5 text-gold-700">vorgemerkt – bitte bestätigen</p>}
        {e.warnings.map((w) => <p key={w} className="mt-0.5 font-medium text-amber-700">{w.startsWith("🌙") ? w : `⚠️ ${w}`}</p>)}
      </Link>
    </li>
  );
}

function isoWeek(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

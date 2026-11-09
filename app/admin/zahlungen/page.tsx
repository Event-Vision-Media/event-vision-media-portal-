import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PaymentControls } from "@/components/admin/PaymentControls";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/catalog";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import { getPaymentSummary, type PaymentSummary } from "@/lib/payments";
import { loadIncome, monthRange } from "@/lib/payment-journal";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

type Filter = "alle" | "ueberfaellig" | "bar" | "rechnung";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "alle", label: "Alle offen" },
  { id: "ueberfaellig", label: "Überfällig" },
  { id: "bar", label: "Bar bei Übergabe" },
  { id: "rechnung", label: "Rechnung fehlt" },
];

const dt = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Zahlungen: „Offen“ (was noch kommen muss, mit Abhaken + Rückgängig) und
 * „Eingänge“ (Kassenbuch je Monat: welches Geld wann von wem eingegangen ist).
 */
export default async function AdminPaymentsPage(props: { searchParams: Promise<{ ansicht?: string; filter?: string; monat?: string }> }) {
  const sp = await props.searchParams;
  const view = sp.ansicht === "eingaenge" ? "eingaenge" : "offen";
  const thisMonth = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 7);

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Zahlungen</h1>
        <div className="mt-4 inline-flex rounded-full border border-anthracite-200 bg-white p-1 text-sm">
          <Link href="/admin/zahlungen" className={`rounded-full px-4 py-1.5 font-medium ${view === "offen" ? "bg-anthracite-900 text-white" : "text-anthracite-600 hover:text-anthracite-900"}`}>
            Offen
          </Link>
          <Link href={`/admin/zahlungen?ansicht=eingaenge&monat=${thisMonth}`} className={`rounded-full px-4 py-1.5 font-medium ${view === "eingaenge" ? "bg-anthracite-900 text-white" : "text-anthracite-600 hover:text-anthracite-900"}`}>
            Eingänge
          </Link>
        </div>
        {view === "offen" ? <OpenView filter={(FILTERS.find((f) => f.id === sp.filter)?.id ?? "alle") as Filter} /> : <IncomeView month={/^\d{4}-\d{2}$/.test(sp.monat ?? "") ? sp.monat! : thisMonth} />}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- Offen */

async function OpenView({ filter }: { filter: Filter }) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recentSince = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data }, { data: recentData }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("source", "website")
      .eq("lifecycle", "bestaetigt")
      .gte("event_date", since)
      .or("deposit_paid_at.is.null,rest_paid_at.is.null,rest_paid_amount.not.is.null")
      .order("event_date", { ascending: true })
      .limit(150),
    supabase
      .from("bookings")
      .select("*")
      .eq("source", "website")
      .or(`deposit_paid_at.gte.${recentSince},rest_paid_at.gte.${recentSince}`)
      .limit(50),
  ]);
  const bookings = (data ?? []) as Booking[];
  const [allRows, { data: invoiceRows }] = await Promise.all([
    Promise.all(bookings.map(async (b) => ({ b, p: await getPaymentSummary(b) }))),
    supabase.from("booking_invoices").select("booking_id, kind").in("booking_id", bookings.map((b) => b.id)),
  ]);
  const invoiced = (bookingId: string, kinds: string[]) => (invoiceRows ?? []).some((i) => i.booking_id === bookingId && kinds.includes(i.kind));

  const rows = allRows
    .filter(({ p }) => !p.depositPaid || !p.restPaid)
    .map(({ b, p }) => {
      const days = daysUntil(b.event_date);
      const depositLate = Boolean(p.deposit !== 0 && !p.depositPaid && b.confirmed_at && Date.now() - Date.parse(b.confirmed_at) > 7 * 86_400_000);
      const restLate = !p.restPaid && p.method === "ueberweisung" && days < p.restDueDays;
      const depositInvoiceMissing = p.deposit !== 0 && !p.depositPaid && !invoiced(b.id, ["anzahlung", "gesamt"]);
      const restInvoiceMissing = !p.restPaid && p.method === "ueberweisung" && days <= 28 && !invoiced(b.id, ["rest", "gesamt"]);
      return { b, p, days, depositLate, restLate, depositInvoiceMissing, restInvoiceMissing };
    });
  const counts: Record<Filter, number> = {
    alle: rows.length,
    ueberfaellig: rows.filter((r) => r.depositLate || r.restLate).length,
    bar: rows.filter((r) => r.p.method === "bar" && !r.p.restPaid).length,
    rechnung: rows.filter((r) => r.depositInvoiceMissing || r.restInvoiceMissing).length,
  };
  const shown = rows.filter((r) =>
    filter === "ueberfaellig" ? r.depositLate || r.restLate : filter === "bar" ? r.p.method === "bar" && !r.p.restPaid : filter === "rechnung" ? r.depositInvoiceMissing || r.restInvoiceMissing : true
  );
  const openOf = (p: PaymentSummary) => (p.depositPaid ? 0 : p.deposit ?? 0) + (p.restPaid ? 0 : p.rest ?? 0);
  const openSum = rows.reduce((s, r) => s + openOf(r.p), 0);
  const lateSum = rows.filter((r) => r.depositLate || r.restLate).reduce((s, r) => s + openOf(r.p), 0);

  // Kürzlich als erhalten markiert (14 Tage) – Versehen sofort sehen und zurücksetzen
  const recent = await Promise.all(((recentData ?? []) as Booking[]).map(async (b) => ({ b, p: await getPaymentSummary(b) })));
  recent.sort((x, y) => (y.b.rest_paid_at ?? y.b.deposit_paid_at ?? "").localeCompare(x.b.rest_paid_at ?? x.b.deposit_paid_at ?? ""));

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-anthracite-100 bg-white p-4">
          <p className="text-xs text-anthracite-500">Insgesamt offen</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-gold-700">{formatCurrencyEUR(openSum)}</p>
        </div>
        <div className={`rounded-2xl border bg-white p-4 ${lateSum > 0 ? "border-red-200" : "border-anthracite-100"}`}>
          <p className="text-xs text-anthracite-500">Davon überfällig</p>
          <p className={`mt-1 font-serif text-2xl font-semibold ${lateSum > 0 ? "text-red-700" : "text-anthracite-800"}`}>{formatCurrencyEUR(lateSum)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "alle" ? "/admin/zahlungen" : `/admin/zahlungen?filter=${f.id}`}
            className={`rounded-full border px-3.5 py-1.5 transition ${f.id === filter ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"}`}
          >
            {f.label} <span className="opacity-70">({counts[f.id]})</span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-anthracite-500">Abhaken speichert nur, dass das Geld da ist – es geht keine E-Mail raus. Eine Bestätigung an den Kunden schickst du in der Buchung über „Gesamtbetrag erhalten“.</p>

      <div className="mt-4 space-y-3">
        {shown.length === 0 && (
          <Card>
            <p className="text-center text-sm text-anthracite-400">{filter === "alle" ? "Alles bezahlt – nichts offen. 🎉" : "Nichts in diesem Filter."}</p>
          </Card>
        )}
        {shown.map(({ b, p, days, depositLate, restLate, depositInvoiceMissing, restInvoiceMissing }) => (
          <Card key={b.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/admin/bookings/${b.id}`} className="font-serif text-lg font-semibold text-anthracite-800 hover:text-gold-700">
                  {b.customer_name || b.couple_names}
                </Link>
                <p className="text-sm text-anthracite-500">
                  {b.booking_code} · Event {formatDateGerman(b.event_date)} {days >= 0 ? `(in ${days} Tagen)` : "(vorbei)"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {depositInvoiceMissing && <Badge tone="gold">Anzahlungsrechnung fehlt</Badge>}
                {restInvoiceMissing && <Badge tone="gold">Restrechnung fehlt</Badge>}
                {depositLate && <Badge tone="danger">Anzahlung überfällig</Badge>}
                {restLate && <Badge tone="danger">Rest überfällig</Badge>}
              </div>
            </div>
            <ul className="divide-y divide-anthracite-100 rounded-xl border border-anthracite-100 text-sm">
              {p.deposit !== 0 && (
                <PayLine label="Anzahlung" amount={p.deposit} paid={p.depositPaid} paidAt={b.deposit_paid_at ?? null} hint="per Überweisung" />
              )}
              <PayLine
                label={p.followUp ? "Nachzahlung" : p.deposit === 0 ? "Gesamtbetrag" : "Restbetrag"}
                amount={p.deposit === 0 && !p.followUp ? p.total : p.rest}
                paid={p.restPaid}
                paidAt={b.rest_paid_at ?? null}
                hint={p.method === "bar" ? `bar bei ${p.pickupOnly ? "Abholung" : "Übergabe"}` : p.method === "ueberweisung" ? `per Überweisung · fällig bis ${formatDateGerman(p.restDueDate)}` : "Zahlungsart noch offen"}
              />
            </ul>
            <PaymentControls
              bookingId={b.id}
              depositPaid={p.depositPaid}
              restPaid={p.restPaid}
              method={p.method}
              noDeposit={p.deposit === 0}
              followUp={p.followUp}
              customer={b.customer_name || b.couple_names}
              depositAmount={p.deposit}
              restAmount={p.deposit === 0 && !p.followUp ? p.total : p.rest}
              compact
            />
          </Card>
        ))}
      </div>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">Kürzlich als erhalten markiert</h2>
          <p className="mt-0.5 text-sm text-anthracite-500">Letzte 14 Tage – falls du dich verklickt hast, hier einfach den Haken wieder entfernen.</p>
          <div className="mt-3 space-y-2">
            {recent.map(({ b, p }) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium text-anthracite-800 hover:text-gold-700">
                    {b.customer_name || b.couple_names}
                  </Link>
                  <span className="text-anthracite-400"> · {b.booking_code}</span>
                  <p className="text-xs text-anthracite-500">
                    {b.deposit_paid_at ? `Anzahlung ✓ ${dt(b.deposit_paid_at)}` : ""}
                    {b.deposit_paid_at && b.rest_paid_at ? " · " : ""}
                    {b.rest_paid_at ? `${p.deposit === 0 ? "Gesamt" : "Rest"} ✓ ${dt(b.rest_paid_at)}` : ""}
                  </p>
                </div>
                <PaymentControls
                  bookingId={b.id}
                  depositPaid={p.depositPaid}
                  restPaid={p.restPaid}
                  method={p.method}
                  noDeposit={p.deposit === 0}
                  followUp={p.followUp}
                  customer={b.customer_name || b.couple_names}
                  depositAmount={p.deposit}
                  restAmount={p.deposit === 0 && !p.followUp ? p.total : p.rest}
                  compact
                />
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function PayLine({ label, amount, paid, paidAt, hint }: { label: string; amount: number | null; paid: boolean; paidAt: string | null; hint: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
      <span className="text-anthracite-700">
        <strong className="font-medium text-anthracite-800">{label}</strong> {amount != null ? formatCurrencyEUR(amount) : "–"}
        <span className="text-anthracite-400"> · {hint}</span>
      </span>
      {paid ? (
        <span className="text-xs font-medium text-emerald-700">✓ erhalten{paidAt ? ` am ${dt(paidAt)}` : ""}</span>
      ) : (
        <span className="text-xs font-medium text-anthracite-500">⏳ offen</span>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- Eingänge */

async function IncomeView({ month }: { month: string }) {
  const r = monthRange(month);
  const yearFrom = `${month.slice(0, 4)}-01-01T00:00:00.000Z`;
  const [entries, yearEntries] = await Promise.all([loadIncome(r.from, r.to), loadIncome(yearFrom, r.to)]);
  const sum = (list: typeof entries) => list.reduce((s, e) => s + e.amount, 0);
  const byMethod = (m: string) => sum(entries.filter((e) => e.method === m));
  const vbSum = sum(entries.filter((e) => e.kind === "VisionBooth online"));

  // nach Tag gruppieren
  const days = new Map<string, typeof entries>();
  for (const e of entries) {
    const d = new Date(e.date).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    days.set(d, [...(days.get(d) ?? []), e]);
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Link href={`/admin/zahlungen?ansicht=eingaenge&monat=${r.prev}`} aria-label="Vormonat" className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-anthracite-200 bg-white text-lg text-anthracite-600 hover:border-gold-300">
          ‹
        </Link>
        <p className="whitespace-nowrap font-serif text-xl font-semibold capitalize text-anthracite-800">{r.label}</p>
        <Link href={`/admin/zahlungen?ansicht=eingaenge&monat=${r.next}`} aria-label="Folgemonat" className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-anthracite-200 bg-white text-lg text-anthracite-600 hover:border-gold-300">
          ›
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Eingegangen im Monat" value={formatCurrencyEUR(sum(entries))} strong />
        <Kpi label="Überweisung" value={formatCurrencyEUR(byMethod("Überweisung"))} />
        <Kpi label="Bar" value={formatCurrencyEUR(byMethod("Bar"))} />
        <Kpi label="VisionBooth online" value={formatCurrencyEUR(vbSum)} />
      </div>
      {byMethod("Zahlweg nicht angegeben") > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Davon {formatCurrencyEUR(byMethod("Zahlweg nicht angegeben"))} ohne Zahlweg – in der Buchung bei „Restzahlung“ Überweisung oder Bar auswählen, dann wird es richtig zugeordnet.
        </p>
      )}
      <p className="mt-2 text-xs text-anthracite-500">
        {month.slice(0, 4)} bis Ende {r.label}: <strong className="text-anthracite-700">{formatCurrencyEUR(sum(yearEntries))}</strong> eingegangen · {entries.length} {entries.length === 1 ? "Zahlung" : "Zahlungen"} in diesem Monat · Beträge brutto, Datum = wann du sie als erhalten abgehakt hast (VisionBooth: Zahlungszeitpunkt).
      </p>
      <div className="mt-3">
        <a href={`/api/admin/zahlungen?monat=${month}`} className="inline-flex items-center gap-2 rounded-full border border-anthracite-200 bg-white px-4 py-2 text-sm font-medium text-anthracite-700 hover:border-gold-300">
          ⬇ Als CSV herunterladen (für Steuer / Lexware)
        </a>
      </div>

      <div className="mt-6 space-y-5">
        {entries.length === 0 && (
          <Card>
            <p className="text-center text-sm text-anthracite-400">In diesem Monat ist noch nichts eingegangen.</p>
          </Card>
        )}
        {Array.from(days.entries()).map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 flex items-baseline justify-between text-sm font-semibold text-anthracite-700">
              <span>{new Date(day + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</span>
              <span className="font-normal text-anthracite-500">{formatCurrencyEUR(sum(list))}</span>
            </h3>
            <div className="divide-y divide-anthracite-100 overflow-hidden rounded-2xl border border-anthracite-100 bg-white">
              {list.map((e, i) => (
                <Link key={i} href={e.href} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-sand-50">
                  <span className="min-w-0">
                    <span className="font-medium text-anthracite-800">{e.customer}</span>
                    <span className="block text-xs text-anthracite-500">
                      {e.kind} · {e.method} · {e.code}
                      {e.eventDate ? ` · Event ${formatDateGerman(e.eventDate)}` : ""}
                    </span>
                  </span>
                  <span className="font-serif text-base font-semibold text-emerald-700">+{formatCurrencyEUR(e.amount)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Kpi({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${strong ? "border-gold-300" : "border-anthracite-100"}`}>
      <p className="text-xs text-anthracite-500">{label}</p>
      <p className={`mt-1 font-serif text-xl font-semibold ${strong ? "text-gold-700" : "text-anthracite-800"}`}>{value}</p>
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { formatCurrencyEUR } from "@/lib/format";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES = {
  "30": { label: "30 Tage", days: 30 },
  "90": { label: "3 Monate", days: 90 },
  "365": { label: "12 Monate", days: 365 },
  alle: { label: "Gesamt", days: 3650 },
} as const;
type RangeKey = keyof typeof RANGES;

/** Logistik-Positionen sind keine Upsells – separat auswerten. */
const LOGISTICS = new Set(["anfahrt", "nachtabholung", "trageservice"]);

const PAGE_LABELS: Record<string, string> = {
  "index.html": "Startseite",
  "preise.html": "Preise",
  "fotospiegel-mieten.html": "Fotospiegel",
  "fotobox-mieten.html": "Fotobox",
  "360-grad-fotobox-mieten.html": "360° Video Booth",
  "audiogaestebuch-mieten.html": "Audiogästebuch",
  "love-buchstaben-mieten.html": "LOVE-Buchstaben",
  "hochzeit-feiern.html": "Hochzeit & Feiern",
  "firmenevents.html": "Firmenevents",
  "layout-designer.html": "Layout-Designer",
};

function pageLabel(p: string): string {
  if (PAGE_LABELS[p]) return PAGE_LABELS[p];
  const city = p.match(/^fotobox-mieten-([a-z]+)\.html$/)?.[1];
  if (city) return `Städteseite ${city.charAt(0).toUpperCase()}${city.slice(1).replace("ue", "ü")}`;
  return p;
}

function count<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

const cityOf = (loc: string | null) => loc?.match(/\b\d{5}\s+([^,]+)/)?.[1]?.trim() ?? null;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

/** Auswertung der Website-Anfragen: Abschlussquote, Umsatz, Upsells, Herkunft. */
export default async function AdminStatsPage({ searchParams }: { searchParams: { zeitraum?: string } }) {
  const range: RangeKey = (searchParams.zeitraum as RangeKey) in RANGES ? (searchParams.zeitraum as RangeKey) : "90";
  const since = new Date(Date.now() - RANGES[range].days * 86_400_000).toISOString();
  const { data } = await createAdminClient()
    .from("bookings")
    .select("id, created_at, event_date, lifecycle, customer_type, occasion, location, total_price, inquiry_items")
    .eq("source", "website")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  const all = (data ?? []) as Pick<Booking, "id" | "created_at" | "event_date" | "lifecycle" | "customer_type" | "occasion" | "location" | "total_price" | "inquiry_items">[];

  const confirmed = all.filter((b) => b.lifecycle === "bestaetigt");
  const open = all.filter((b) => b.lifecycle === "anfrage" || b.lifecycle === "reserviert");
  const lost = all.filter((b) => b.lifecycle === "abgelehnt" || b.lifecycle === "storniert");
  const decided = confirmed.length + lost.length;
  const revenue = confirmed.reduce((s, b) => s + Number(b.total_price ?? 0), 0);
  const avg = confirmed.length ? revenue / confirmed.length : 0;
  const leadDays = all.map((b) => (Date.parse(b.event_date) - Date.parse(b.created_at)) / 86_400_000).filter((d) => d >= 0);
  const avgLead = leadDays.length ? Math.round(leadDays.reduce((a, b) => a + b, 0) / leadDays.length) : null;

  // Monate
  const months = new Map<string, { n: number; ok: number; eur: number }>();
  for (const b of all) {
    const k = b.created_at.slice(0, 7);
    const m = months.get(k) ?? { n: 0, ok: 0, eur: 0 };
    m.n++;
    if (b.lifecycle === "bestaetigt") {
      m.ok++;
      m.eur += Number(b.total_price ?? 0);
    }
    months.set(k, m);
  }

  const packages = count(all.flatMap((b) => b.inquiry_items?.packages ?? []), (p) => p.name);
  const extras = count(all.flatMap((b) => (b.inquiry_items?.extras ?? []).filter((e) => !LOGISTICS.has(e.id))), (e) => e.name);
  const logistics = count(all.flatMap((b) => (b.inquiry_items?.extras ?? []).filter((e) => LOGISTICS.has(e.id))), (e) =>
    e.id === "anfahrt" ? "Anfahrt über 30 km" : e.id === "nachtabholung" ? "Nachtabholung" : "Trageservice"
  );
  const pages = count(all, (b) => (b.inquiry_items?.source?.page ? pageLabel(b.inquiry_items.source.page) : null));
  const refs = count(all, (b) => {
    const s = b.inquiry_items?.source;
    return s?.source ? `${s.source}${s.medium ? ` / ${s.medium}` : ""}` : s?.ref ?? (s?.page ? "direkt auf der Website" : null);
  });
  const occasions = count(all, (b) => b.occasion);
  const cities = count(all, (b) => cityOf(b.location));
  const withSource = all.filter((b) => b.inquiry_items?.source).length;

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Statistik</h1>
        <p className="mt-1 text-sm text-anthracite-500">
          Anfragen über die Website – was daraus wird und was Kunden wählen. Besucherzahlen und Google-Suchbegriffe siehst du in Vercel Analytics bzw. der Search Console.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/statistik?zeitraum=${k}`}
              className={`rounded-full border px-4 py-1.5 transition ${k === range ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"}`}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Anfragen" value={String(all.length)} />
          <Kpi label="Bestätigt" value={String(confirmed.length)} />
          <Kpi label="Abschlussquote" value={pct(confirmed.length, decided)} hint={`${decided} entschieden · ${open.length} offen`} />
          <Kpi label="Umsatz (bestätigt)" value={formatCurrencyEUR(revenue)} hint="laut Anfrage" />
          <Kpi label="Ø Auftragswert" value={confirmed.length ? formatCurrencyEUR(avg) : "–"} />
          <Kpi label="Ø Vorlauf" value={avgLead != null ? `${avgLead} Tage` : "–"} hint="Anfrage bis Event" />
        </div>

        {all.length === 0 ? (
          <Card className="mt-6"><p className="text-center text-sm text-anthracite-400">In diesem Zeitraum gibt es noch keine Website-Anfragen.</p></Card>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">Verlauf nach Monat</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-anthracite-400">
                  <tr><th className="pb-2 font-medium">Monat</th><th className="pb-2 text-right font-medium">Anfragen</th><th className="pb-2 text-right font-medium">Bestätigt</th><th className="pb-2 text-right font-medium">Umsatz</th></tr>
                </thead>
                <tbody className="divide-y divide-anthracite-50">
                  {Array.from(months.entries()).map(([k, m]) => (
                    <tr key={k}>
                      <td className="py-1.5 text-anthracite-700">{new Date(k + "-15").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</td>
                      <td className="py-1.5 text-right">{m.n}</td>
                      <td className="py-1.5 text-right">{m.ok} <span className="text-xs text-anthracite-400">({pct(m.ok, m.n)})</span></td>
                      <td className="py-1.5 text-right">{formatCurrencyEUR(m.eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Bars title="Woher kommen die Anfragen?" rows={refs} total={withSource} empty="Wird ab jetzt bei neuen Anfragen erfasst." />
            <Bars title="Über welche Seite wurde angefragt?" rows={pages} total={withSource} empty="Wird ab jetzt bei neuen Anfragen erfasst." />
            <Bars title="Gewählte Pakete" rows={packages} total={all.length} />
            <Bars title="Extras (Upsells)" rows={extras} total={all.length} hint="Anteil der Anfragen mit diesem Extra" />
            <Bars title="Logistik-Aufpreise" rows={logistics} total={all.length} empty="Noch keine Anfahrt über 30 km, Nachtabholung oder Trageservice." />
            <Bars title="Anlässe" rows={occasions} total={all.length} />
            <Bars title="Orte der Veranstaltungen" rows={cities.slice(0, 10)} total={all.length} />
            <Bars
              title="Privat / Business"
              rows={count(all, (b) => (b.customer_type === "business" ? "Business" : "Privat"))}
              total={all.length}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="h-full rounded-2xl border border-anthracite-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-anthracite-500">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold text-anthracite-800">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-anthracite-400">{hint}</p>}
    </div>
  );
}

function Bars({ title, rows, total, hint, empty }: { title: string; rows: [string, number][]; total: number; hint?: string; empty?: string }) {
  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">{title}</h2>
      {hint && <p className="text-xs text-anthracite-400">{hint}</p>}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-anthracite-400">{empty ?? "Keine Daten."}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 10).map(([name, n]) => (
            <li key={name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate text-anthracite-700">{name}</span>
                <span className="flex-none text-anthracite-500">{n} · {total ? Math.round((n / total) * 100) : 0} %</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-sand-100">
                <div className="h-1.5 rounded-full bg-gold-500" style={{ width: `${total ? Math.min(100, (n / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

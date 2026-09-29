import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PaymentControls } from "@/components/admin/PaymentControls";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { daysUntil } from "@/lib/catalog";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import { getPaymentSummary } from "@/lib/payments";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Offene Zahlungen: alle bestätigten Website-Buchungen (Event max. 30 Tage
 * her), bei denen Anzahlung oder Restbetrag noch nicht abgehakt ist.
 */
export default async function AdminPaymentsPage() {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("source", "website")
    .eq("lifecycle", "bestaetigt")
    .gte("event_date", since)
    .or("deposit_paid_at.is.null,rest_paid_at.is.null")
    .order("event_date", { ascending: true })
    .limit(100);

  const bookings = (data ?? []) as Booking[];
  const rows = await Promise.all(bookings.map(async (b) => ({ b, p: await getPaymentSummary(b) })));
  const openSum = rows.reduce(
    (sum, { p }) => sum + (p.depositPaid ? 0 : p.deposit ?? 0) + (p.restPaid ? 0 : p.rest ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-anthracite-800">Offene Zahlungen</h1>
            <p className="mt-1 text-sm text-anthracite-500">
              Bestätigte Buchungen, bei denen noch etwas offen ist. Rechnungen erstellst du in Lexware Office – hier nur abhaken.
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif text-2xl font-semibold text-gold-700">{formatCurrencyEUR(openSum)}</div>
            <div className="text-xs text-anthracite-400">insgesamt offen</div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.length === 0 && (
            <Card><p className="text-center text-sm text-anthracite-400">Alles bezahlt – nichts offen. 🎉</p></Card>
          )}
          {rows.map(({ b, p }) => {
            const days = daysUntil(b.event_date);
            const depositLate = !p.depositPaid && b.confirmed_at && Date.now() - Date.parse(b.confirmed_at) > 7 * 86_400_000;
            const restLate = !p.restPaid && p.method === "ueberweisung" && days < 7;
            return (
              <Card key={b.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/bookings/${b.id}`} className="font-serif text-lg font-semibold text-anthracite-800 hover:text-gold-700">
                      {b.couple_names}
                    </Link>
                    <p className="text-sm text-anthracite-500">
                      {b.booking_code} · {formatDateGerman(b.event_date)} {days >= 0 ? `(in ${days} Tagen)` : "(vorbei)"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {depositLate && <Badge tone="danger">Anzahlung überfällig</Badge>}
                    {restLate && <Badge tone="danger">Rest überfällig</Badge>}
                    {p.method === "bar" && !p.restPaid && <Badge tone="gold">Bar mitnehmen: {p.rest != null ? formatCurrencyEUR(p.rest) : "–"}</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-anthracite-600">
                    Anzahlung {p.deposit != null ? formatCurrencyEUR(p.deposit) : "–"} · Rest {p.rest != null ? formatCurrencyEUR(p.rest) : "–"}
                    {p.method === "ueberweisung" ? " per Überweisung" : p.method === "bar" ? " bar" : ""}
                  </span>
                  <PaymentControls bookingId={b.id} depositPaid={p.depositPaid} restPaid={p.restPaid} method={p.method} compact />
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

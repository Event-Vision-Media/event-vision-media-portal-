import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AccessCodeCell } from "@/components/admin/AccessCodeCell";
import { Card } from "@/components/ui/Card";
import { formatDateGerman } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Übersicht zum Verschicken der neuen, sicheren Zugangscodes an Kunden mit
 * anstehenden Events (Übergang vom fortlaufenden FB-Buchungscode).
 */
export default async function AdminAccessCodesPage() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("bookings")
    .select("id, booking_code, couple_names, customer_name, phone, event_date, access_code, lifecycle")
    .in("lifecycle", ["bestaetigt", "reserviert"])
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  const legacyActive = process.env.LEGACY_BOOKING_CODE_LOGIN !== "false";

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/settings" className="text-sm text-anthracite-400 hover:text-anthracite-700">← Einstellungen</Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-anthracite-800">Zugangscodes</h1>
        <p className="mt-1 mb-6 text-sm text-anthracite-500">
          Jede Buchung hat einen zufälligen, nicht erratbaren Zugangscode. Schick ihn deinen Kunden mit anstehenden
          Events – danach kannst du den Login per FB-Buchungscode abschalten.
        </p>

        <Card className={`mb-6 ${legacyActive ? "border-gold-300 bg-gold-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="text-sm text-anthracite-700">
            {legacyActive ? (
              <>Login per <strong>FB-Buchungscode ist noch aktiv</strong> (Übergangsphase). Sobald alle Kunden ihren neuen
              Code haben: Umgebungsvariable <code>LEGACY_BOOKING_CODE_LOGIN=false</code> setzen und neu deployen.</>
            ) : (
              <>Login per FB-Buchungscode ist <strong>abgeschaltet</strong> – nur noch Zugangscode oder individuelles Passwort.</>
            )}
          </p>
        </Card>

        <div className="overflow-x-auto rounded-2xl border border-anthracite-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-anthracite-100 text-sm">
            <thead className="bg-anthracite-50 text-left text-xs uppercase tracking-wide text-anthracite-400">
              <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Kunde</th><th className="px-4 py-3">Zugangscode</th></tr>
            </thead>
            <tbody className="divide-y divide-anthracite-50">
              {(data ?? []).map((b: any) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-anthracite-600">
                    {formatDateGerman(b.event_date)}
                    <div className="text-xs text-anthracite-400">{b.booking_code}</div>
                  </td>
                  <td className="px-4 py-3 text-anthracite-800">
                    <Link href={`/admin/bookings/${b.id}`} className="hover:text-gold-700 hover:underline">{b.couple_names}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <AccessCodeCell bookingId={b.id} code={b.access_code} customerName={b.customer_name || b.couple_names} phone={b.phone} />
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-anthracite-400">Keine anstehenden Buchungen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

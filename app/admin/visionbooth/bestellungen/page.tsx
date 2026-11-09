import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { getOccasion, getPlan } from "@/components/visionbooth/packages";
import { lexwareEnabled, lexwareKeySet } from "@/lib/lexware";
import { VbLexwareDraftTest } from "@/components/admin/visionbooth/VbLexwareDraftTest";
import { VbInvoiceRetry } from "@/components/admin/visionbooth/VbInvoiceRetry";
import { formatDateGerman } from "@/lib/format";
import { VbOrdersSeen } from "@/components/admin/visionbooth/VbOrdersSeen";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { offen: "Zahlung offen", wird_eingerichtet: "Wird eingerichtet", bezahlt: "Bezahlt", abgebrochen: "Abgebrochen", fehler: "Fehler beim Einrichten" };
const euro = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** Online-Bestellungen von visionbooth.de mit Zahlungs- und Rechnungsstatus. */
export default async function AdminVbOrdersPage() {
  const { data } = await createAdminClient().from("vb_orders").select("*").order("created_at", { ascending: false }).limit(200);
  const orders = data ?? [];
  const invoicesOn = lexwareEnabled();
  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <VbOrdersSeen />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/visionbooth" className="text-sm text-anthracite-500 hover:underline">← VisionBooth</Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-anthracite-800">Online-Bestellungen</h1>
        <p className="mt-1 text-sm text-anthracite-500">
          Buchungen über die Website. Rechnungen entstehen automatisch in Lexware
          {invoicesOn ? "." : " – zurzeit ausgeschaltet (VB_INVOICES / LEXWARE_API_KEY fehlt)."}
        </p>
        {lexwareKeySet() && !invoicesOn && (
          <div className="mt-4">
            <VbLexwareDraftTest />
          </div>
        )}
        <div className="mt-6 space-y-3">
          {orders.length === 0 && <p className="text-sm text-anthracite-400">Noch keine Online-Bestellungen.</p>}
          {orders.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-anthracite-800">
                    {o.frame_text || o.title} · {getPlan(o.plan).label} · {o.paid_cents != null && o.paid_cents < o.amount_cents ? `${euro(o.paid_cents)} (Gutschein, statt ${euro(o.amount_cents)})` : euro(o.amount_cents)}
                  </p>
                  <p className="mt-0.5 text-sm text-anthracite-500">
                    {o.name}
                    {o.company ? ` (${o.company})` : ""} · {o.email} · {getOccasion(o.occasion).label}
                    {o.event_date ? ` am ${formatDateGerman(o.event_date)}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-anthracite-400">Bestellt {new Date(o.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${o.status === "bezahlt" ? "bg-emerald-50 text-emerald-700" : o.status === "fehler" ? "bg-red-50 text-red-700" : "bg-sand-100 text-anthracite-600"}`}>
                  {STATUS[o.status] ?? o.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {o.vb_event_id && (
                  <Link href={`/admin/visionbooth/${o.vb_event_id}`} className="rounded-lg border border-anthracite-200 bg-white px-3 py-1.5 hover:border-gold-300">
                    Event öffnen
                  </Link>
                )}
                {o.invoice_path ? (
                  <a href={`/api/admin/vb-rechnung/${o.id}`} target="_blank" className="rounded-lg border border-anthracite-200 bg-white px-3 py-1.5 hover:border-gold-300">
                    🧾 Rechnung {o.invoice_number ?? ""} (PDF)
                  </a>
                ) : (
                  o.status === "bezahlt" && (
                    <>
                      {o.invoice_error && o.invoice_error !== "in_arbeit" && <span className="text-xs text-red-600">Rechnung: {o.invoice_error}</span>}
                      {invoicesOn && <VbInvoiceRetry orderId={o.id} />}
                    </>
                  )
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

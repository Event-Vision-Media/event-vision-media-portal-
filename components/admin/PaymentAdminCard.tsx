import { Card } from "@/components/ui/Card";
import { PaymentControls } from "@/components/admin/PaymentControls";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import type { PaymentSummary } from "@/lib/payments";

/** Zahlungen in den Buchungsdetails (Admin). Rechnungen werden in Lexware Office erstellt. */
export function PaymentAdminCard({ bookingId, p }: { bookingId: string; p: PaymentSummary }) {
  const from = p.isFromPrice ? "ab " : "";
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">Zahlungen</h2>
        {p.total != null && <span className="font-serif text-xl font-semibold text-gold-700">{from}{formatCurrencyEUR(p.total)}</span>}
      </div>
      {p.total == null ? (
        <p className="mb-4 text-sm text-anthracite-500">Für diese Buchung ist kein Preis hinterlegt – Beträge laut deiner Rechnung.</p>
      ) : (
        <dl className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-anthracite-500">Anzahlung</dt><dd className="font-medium">{formatCurrencyEUR(p.deposit!)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-anthracite-500">
              Restbetrag {p.method === "bar" ? "· bar bei Lieferung" : p.method === "ueberweisung" ? `· Überweisung bis ${formatDateGerman(p.restDueDate)}` : ""}
            </dt>
            <dd className="font-medium">{from}{formatCurrencyEUR(p.rest!)}</dd>
          </div>
        </dl>
      )}
      <PaymentControls bookingId={bookingId} depositPaid={p.depositPaid} restPaid={p.restPaid} method={p.method} />
      <p className="mt-3 text-xs text-anthracite-400">
        Rechnungen erstellst du wie gewohnt in Lexware Office (Verwendungszweck: Buchungsnummer). Hier hakst du nur ab, was eingegangen ist –
        offene Anzahlungen werden nach 7 Tagen automatisch freundlich erinnert.
      </p>
    </Card>
  );
}

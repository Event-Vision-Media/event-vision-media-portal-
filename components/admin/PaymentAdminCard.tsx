import { Card } from "@/components/ui/Card";
import { PaymentControls } from "@/components/admin/PaymentControls";
import { InvoiceAdminSection } from "@/components/admin/InvoiceAdminSection";
import { invoiceTitle, type BookingInvoice } from "@/lib/invoices";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import type { PaymentSummary } from "@/lib/payments";

/** Zahlungen in den Buchungsdetails (Admin). Rechnungen werden in Lexware Office erstellt. */
export function PaymentAdminCard({
  bookingId,
  p,
  invoices,
  hasEmail,
}: {
  bookingId: string;
  p: PaymentSummary;
  invoices: BookingInvoice[];
  hasEmail: boolean;
}) {
  const from = p.isFromPrice ? "ab " : "";
  // Vorschlag fürs Upload-Formular: zuerst die Anzahlung, danach der Rest (bzw. alles ohne Anzahlung)
  const hasKind = (k: string) => invoices.some((i) => i.kind === k);
  const defaultKind = p.deposit === 0 ? "gesamt" : p.deposit && !hasKind("anzahlung") ? "anzahlung" : "rest";
  const defaultAmount = defaultKind === "anzahlung" ? p.deposit : p.rest;
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
          {p.deposit === 0 ? (
            <div className="flex justify-between"><dt className="text-anthracite-500">Anzahlung</dt><dd className="font-medium text-anthracite-500">keine (bis 150 €)</dd></div>
          ) : (
            <div className="flex justify-between"><dt className="text-anthracite-500">Anzahlung</dt><dd className="font-medium">{formatCurrencyEUR(p.deposit!)}</dd></div>
          )}
          <div className="flex justify-between">
            <dt className="text-anthracite-500">
              {p.deposit === 0 ? "Gesamtbetrag" : "Restbetrag"}{" "}
              {p.method === "bar" ? `· bar bei ${p.pickupOnly ? "Abholung" : "Lieferung"}` : p.method === "ueberweisung" ? `· Überweisung bis ${formatDateGerman(p.restDueDate)}` : ""}
            </dt>
            <dd className="font-medium">{from}{formatCurrencyEUR(p.rest!)}</dd>
          </div>
        </dl>
      )}
      <PaymentControls bookingId={bookingId} depositPaid={p.depositPaid} restPaid={p.restPaid} method={p.method} noDeposit={p.deposit === 0} />
      <p className="mt-3 text-xs text-anthracite-400">
        Rechnungen erstellst du wie gewohnt in Lexware Office (Verwendungszweck: Buchungsnummer) und lädst das PDF hier hoch – der Kunde bekommt es
        per E-Mail und findet es im Portal. Eingänge hakst du oben ab; offene Anzahlungen werden nach 7 Tagen automatisch freundlich erinnert.
      </p>
      <InvoiceAdminSection
        bookingId={bookingId}
        invoices={invoices.map((i) => ({ id: i.id, title: invoiceTitle(i), amount: i.amount, emailed_at: i.emailed_at, created_at: i.created_at }))}
        defaultKind={defaultKind}
        defaultAmount={defaultAmount}
        hasEmail={hasEmail}
      />
    </Card>
  );
}

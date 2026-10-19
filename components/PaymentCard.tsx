import { Card } from "@/components/ui/Card";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";
import type { PaymentSummary } from "@/lib/payments";

/** Zahlungsübersicht im Kundenportal: Anzahlung, Restbetrag, Bankverbindung. */
export function PaymentCard({
  p,
  sie,
  confirmed,
  bookingCode,
  hasContract,
  invoices = [],
}: {
  invoices?: { id: string; kind: string; title: string; amount: number | null; date: string }[];
  p: PaymentSummary;
  sie: boolean;
  confirmed: boolean;
  bookingCode: string;
  hasContract: boolean;
}) {
  if (p.total == null || p.deposit == null || p.rest == null) return null;
  const t = (du: string, s: string) => (sie ? s : du);
  const from = p.isFromPrice ? "ab " : "";

  const depositStatus = p.depositPaid
    ? { label: "Erhalten ✓", tone: "text-emerald-700" }
    : hasContract
      ? invoices.some((i) => i.kind === "anzahlung")
        ? { label: "Rechnung liegt unten bereit – bitte innerhalb von 7 Tagen überweisen", tone: "text-gold-700" }
        : { label: t("Rechnung kommt per E-Mail – bitte innerhalb von 7 Tagen überweisen", "Rechnung folgt per E-Mail – bitte innerhalb von 7 Tagen überweisen"), tone: "text-gold-700" }
      : { label: t("Fällig nach der Vertragsunterschrift", "Fällig nach der Vertragsunterschrift"), tone: "text-anthracite-500" };

  const noDeposit = p.deposit === 0;
  const restStatus = p.restPaid
    ? { label: "Erhalten ✓", tone: "text-emerald-700" }
    : p.method === "bar"
      ? { label: p.pickupOnly ? "Bar bei Abholung" : "Bar bei Lieferung", tone: "text-anthracite-600" }
      : p.method === "ueberweisung"
        ? { label: `Überweisung bis ${formatDateGerman(p.restDueDate)}`, tone: "text-anthracite-600" }
        : { label: t("Zahlungsart wählt ihr beim Vertrag", "Zahlungsart wählen Sie beim Vertrag"), tone: "text-anthracite-500" };

  const showBank = p.bank?.iban && (!p.depositPaid || (p.method === "ueberweisung" && !p.restPaid));

  return (
    <Card className="animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">Zahlung</h2>
        {p.depositPaid && p.restPaid && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Vollständig bezahlt</span>
        )}
      </div>
      <div className="mt-4 divide-y divide-anthracite-100 text-sm">
        {noDeposit ? (
          <Row title={t("Gesamtbetrag – keine Anzahlung", "Gesamtbetrag – keine Anzahlung")} amount={from + formatCurrencyEUR(p.rest)} status={restStatus} />
        ) : (
          <>
            <Row title="Anzahlung" amount={formatCurrencyEUR(p.deposit)} status={depositStatus} />
            <Row title="Restbetrag" amount={from + formatCurrencyEUR(p.rest)} status={restStatus} />
          </>
        )}
      </div>

      {invoices.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-anthracite-400">{t("Eure Rechnungen", "Ihre Rechnungen")}</p>
          <ul className="mt-2 space-y-1.5">
            {invoices.map((i) => (
              <li key={i.id}>
                <a
                  href={`/api/invoices/${i.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-anthracite-100 bg-white px-3 py-2.5 text-sm transition hover:border-gold-300"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-anthracite-800">📄 {i.title}</span>
                    <span className="block text-xs text-anthracite-400">vom {formatDateGerman(i.date.slice(0, 10))}{i.amount != null && ` · ${formatCurrencyEUR(i.amount)}`}</span>
                  </span>
                  <span className="flex-none text-xs font-semibold text-gold-700">PDF ↓</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showBank && (
        <div className="mt-4 rounded-xl bg-sand-50 p-4 text-sm">
          <p className="font-medium text-anthracite-700">Bankverbindung</p>
          <p className="mt-1 text-anthracite-600">
            {p.bank!.holder && <>{p.bank!.holder}<br /></>}
            IBAN {p.bank!.iban}
            {p.bank!.bic && <> · BIC {p.bank!.bic}</>}
          </p>
          <p className="mt-2 text-anthracite-600">
            Verwendungszweck: <span className="font-medium text-anthracite-800">{bookingCode}</span>
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-anthracite-400">
        {hasContract
          ? t(
              `Die Rechnung bekommt ihr von uns per E-Mail und findet sie hier im Portal. Später im Portal zugebuchte Extras rechnen wir mit dem ${noDeposit ? "Gesamtbetrag" : "Restbetrag"} ab.`,
              `Die Rechnung erhalten Sie von uns per E-Mail und finden sie hier im Portal. Später im Portal zugebuchte Extras rechnen wir mit dem ${noDeposit ? "Gesamtbetrag" : "Restbetrag"} ab.`
            )
          : t(
              `Die Zahlungsart für den ${noDeposit ? "Betrag" : "Restbetrag"} wählt ihr beim Unterschreiben des Mietvertrags.`,
              `Die Zahlungsart für den ${noDeposit ? "Betrag" : "Restbetrag"} wählen Sie beim Unterschreiben des Mietvertrags.`
            )}{" "}
        Endpreise gemäß § 19 UStG ohne Umsatzsteuer.
      </p>
    </Card>
  );
}

function Row({ title, amount, status }: { title: string; amount: string; status: { label: string; tone: string } }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="font-medium text-anthracite-800">{title}</p>
        <p className={`mt-0.5 text-xs ${status.tone}`}>{status.label}</p>
      </div>
      <span className="whitespace-nowrap font-semibold text-anthracite-800">{amount}</span>
    </div>
  );
}

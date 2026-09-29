import "server-only";
import { buildContractFor, getBankDetails, getLatestContract } from "@/lib/contract-server";
import { depositFor, restDueDaysFor, type BankDetails } from "@/lib/contract";
import type { Booking } from "@/lib/types";

export interface PaymentSummary {
  /** Aktueller Gesamtpreis inkl. im Portal zugebuchter Leistungen (null = kein Preis hinterlegt). */
  total: number | null;
  deposit: number | null;
  rest: number | null;
  method: "ueberweisung" | "bar" | null;
  depositPaid: boolean;
  restPaid: boolean;
  /** Fälligkeit der Restzahlung per Überweisung (YYYY-MM-DD), 14 Tage vor dem Event (ältere Verträge: 7). */
  restDueDate: string;
  restDueDays: number;
  isFromPrice: boolean;
  bank: BankDetails | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

function minusDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Anzahlung = Betrag laut unterschriebenem Vertrag (sonst 20 % auf volle 50 € gerundet vom aktuellen
 * Gesamtpreises); später zugebuchte Leistungen landen im Restbetrag.
 */
export async function getPaymentSummary(booking: Booking): Promise<PaymentSummary> {
  const [doc, bank, signed] = await Promise.all([buildContractFor(booking), getBankDetails(), getLatestContract(booking.id)]);
  const restDueDays = restDueDaysFor(signed?.template_version);
  const total = doc.totalAmount;
  const deposit =
    booking.deposit_amount != null ? Number(booking.deposit_amount) : total != null ? depositFor(total) : null;
  return {
    total,
    deposit,
    rest: total != null && deposit != null ? round(total - deposit) : null,
    method: booking.rest_payment_method ?? null,
    depositPaid: Boolean(booking.deposit_paid_at),
    restPaid: Boolean(booking.rest_paid_at),
    restDueDate: minusDays(booking.event_date, restDueDays),
    restDueDays,
    isFromPrice: Boolean(booking.inquiry_items?.isFromPrice),
    bank,
  };
}

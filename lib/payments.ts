import "server-only";
import { buildContractFor, getBankDetails, getLatestContract } from "@/lib/contract-server";
import { afterEventDueDate, depositForBooking, fullPaymentTerms, isShortNotice, restDueDaysFor, SHORT_LAST_DAYS, shortNoticeLastDay, type BankDetails } from "@/lib/contract";
import type { Booking } from "@/lib/types";


export interface PaymentSummary {
  /** Aktueller Gesamtpreis inkl. im Portal zugebuchter Leistungen (null = kein Preis hinterlegt). */
  total: number | null;
  deposit: number | null;
  rest: number | null;
  method: "ueberweisung" | "bar" | null;
  /** Kein Lieferservice: Übergabe bei Abholung (für Texte „bar bei Abholung“). */
  pickupOnly: boolean;
  depositPaid: boolean;
  restPaid: boolean;
  /** Fälligkeit der Restzahlung per Überweisung (YYYY-MM-DD), 14 Tage vor dem Event (ältere Verträge: 7). */
  restDueDate: string;
  restDueDays: number;
  /** Kurzfristige Buchung: keine Anzahlung, Gesamtbetrag 3 Tage nach Rechnung (spätestens 2 Tage vorher) oder bar. */
  shortNotice: boolean;
  /** Rechnung nach der Veranstaltung (so vereinbart): Zahlungsziel in Tagen, sonst null. */
  afterEvent: number | null;
  /** Zahlungsweise individuell vereinbart (keine Anzahlung wegen Vereinbarung). */
  agreed: boolean;
  isFromPrice: boolean;
  bank: BankDetails | null;
  /** Nach vollständiger Zahlung später zugebucht: offene Differenz (rest = Nachzahlung, method = deren Zahlungsart). */
  followUp: boolean;
  /** Bei Nachzahlung: bereits bezahlter Gesamtbetrag. */
  paidTotal: number | null;
  /** Bei Nachzahlung: neu dazugekommene bzw. geänderte Positionen. */
  addedLines: { name: string; price: string }[];
  /** Bei Nachzahlung: bereits bezahlte Positionen, die ersetzt wurden (z. B. kleineres Paket vor dem Upgrade). */
  replacedLines: { name: string; price: string }[];
  /** Aktuelle Positionen (zum Merken beim Abhaken). */
  lines: { name: string; price: string }[];
  /** Versand statt Übergabe – Nachzahlung nur per Überweisung möglich. */
  shippingOnly: boolean;
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
  const shortNotice = isShortNotice(booking);
  const agreed = shortNotice ? null : fullPaymentTerms(booking);
  const afterEvent = agreed?.after ? agreed.dueDays : null;
  // Nach der Veranstaltung: negative Tage (= so viele Tage NACH dem Event fällig)
  const restDueDays = shortNotice ? SHORT_LAST_DAYS : afterEvent != null ? -afterEvent : agreed?.dueDays ?? restDueDaysFor(signed?.template_version);
  const total = doc.totalAmount;
  const deposit =
    booking.deposit_amount != null ? Number(booking.deposit_amount) : total != null ? depositForBooking(total, booking) : null;
  // Nachzahlung: Rest war schon bezahlt (mit gemerktem Betrag), der Preis ist danach gestiegen
  const paidTotal = booking.rest_paid_amount != null ? Number(booking.rest_paid_amount) : null;
  const followUp = Boolean(booking.rest_paid_at) && paidTotal != null && total != null && total - paidTotal > 0.009;
  return {
    total,
    deposit,
    rest: followUp ? round(total! - paidTotal!) : total != null && deposit != null ? round(total - deposit) : null,
    method: followUp ? booking.extra_payment_method ?? null : afterEvent != null ? "ueberweisung" : booking.rest_payment_method ?? null,
    followUp,
    paidTotal: followUp ? paidTotal : null,
    addedLines: followUp ? diffLines(booking.rest_paid_lines ?? null, doc.lines) : [],
    replacedLines: followUp && booking.rest_paid_lines ? diffLines(doc.lines, booking.rest_paid_lines) : [],
    lines: doc.lines.map((l) => ({ name: l.name, price: l.price })),
    shippingOnly: doc.shippedOnly,
    pickupOnly: !doc.hasDelivery,
    // Ohne Anzahlung (Gesamtpreis bis NO_DEPOSIT_UP_TO) gibt es nichts anzuzahlen
    depositPaid: Boolean(booking.deposit_paid_at) || deposit === 0,
    restPaid: Boolean(booking.rest_paid_at) && !followUp,
    restDueDate: shortNotice ? shortNoticeLastDay(booking.event_date) : afterEvent != null ? afterEventDueDate(booking.event_date, booking.event_days, afterEvent) : minusDays(booking.event_date, restDueDays),
    restDueDays,
    shortNotice,
    afterEvent,
    agreed: Boolean(agreed),
    isFromPrice: Boolean(booking.inquiry_items?.isFromPrice),
    bank,
  };
}

/** Positionen, die seit der Zahlung neu sind (gleicher Name + Preis zählt als schon bezahlt). */
function diffLines(before: { name: string; price: string }[] | null, now: { name: string; price: string }[]): { name: string; price: string }[] {
  if (!before) return [];
  const left = before.map((l) => `${l.name}|${l.price}`);
  const out: { name: string; price: string }[] = [];
  for (const l of now) {
    const i = left.indexOf(`${l.name}|${l.price}`);
    if (i >= 0) left.splice(i, 1);
    else out.push({ name: l.name.replace(/ \(im Kundenportal gebucht\)$/, ""), price: l.price });
  }
  return out;
}

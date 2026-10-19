import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const INVOICE_BUCKET = "invoices";
// Vercel nimmt pro Anfrage max. 4,5 MB an – Lexware-PDFs liegen meist unter 500 KB.
export const INVOICE_MAX_BYTES = 4 * 1024 * 1024;

export type InvoiceKind = "anzahlung" | "rest" | "gesamt" | "sonstige";

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  anzahlung: "Anzahlungsrechnung",
  rest: "Rechnung Restbetrag",
  gesamt: "Rechnung",
  sonstige: "Rechnung",
};

export interface BookingInvoice {
  id: string;
  booking_id: string;
  kind: InvoiceKind;
  invoice_number: string | null;
  amount: number | null;
  file_name: string;
  emailed_at: string | null;
  created_at: string;
}

export async function listInvoices(bookingId: string): Promise<BookingInvoice[]> {
  const { data } = await createAdminClient()
    .from("booking_invoices")
    .select("id, booking_id, kind, invoice_number, amount, file_name, emailed_at, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as BookingInvoice[]).map((i) => ({ ...i, amount: i.amount != null ? Number(i.amount) : null }));
}

/** „Anzahlungsrechnung RE-1042“ */
export function invoiceTitle(i: Pick<BookingInvoice, "kind" | "invoice_number">): string {
  return `${INVOICE_KIND_LABELS[i.kind]}${i.invoice_number ? ` ${i.invoice_number}` : ""}`;
}

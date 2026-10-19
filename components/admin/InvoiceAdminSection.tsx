"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { uploadInvoice, deleteInvoice } from "@/app/actions/admin-invoices";
import type { AdminActionResult } from "@/app/actions/admin";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";

type InvoiceKind = "anzahlung" | "rest" | "gesamt" | "sonstige";
interface InvoiceRow {
  id: string;
  title: string;
  amount: number | null;
  emailed_at: string | null;
  created_at: string;
}

const initialState: AdminActionResult = {};

/** Rechnungen einer Buchung (Admin): Liste + PDF aus Lexware hochladen und an den Kunden schicken. */
export function InvoiceAdminSection({
  bookingId,
  invoices,
  defaultKind,
  defaultAmount,
  hasEmail,
}: {
  bookingId: string;
  invoices: InvoiceRow[];
  defaultKind: InvoiceKind;
  defaultAmount: number | null;
  hasEmail: boolean;
}) {
  const [state, formAction] = useFormState(uploadInvoice.bind(null, bookingId), initialState);
  const [isPending, start] = useTransition();

  return (
    <div className="mt-4 border-t border-anthracite-100 pt-4">
      <h3 className="text-sm font-semibold text-anthracite-800">Rechnungen</h3>
      {invoices.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-sm">
          {invoices.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-sand-50 px-3 py-2">
              <a href={`/api/invoices/${i.id}`} className="min-w-0 truncate font-medium text-anthracite-800 hover:text-gold-700">
                📄 {i.title}
                {i.amount != null && <span className="font-normal text-anthracite-500"> · {formatCurrencyEUR(i.amount)}</span>}
              </a>
              <span className="flex flex-none items-center gap-3 text-xs text-anthracite-400">
                {i.emailed_at ? `per Mail ${formatDateGerman(i.emailed_at.slice(0, 10))}` : `nur im Portal`}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`„${i.title}“ wirklich entfernen? Sie verschwindet auch aus dem Kundenportal.`)) start(async () => void (await deleteInvoice(i.id)));
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-anthracite-400">Noch keine Rechnung hochgeladen.</p>
      )}

      <form action={formAction} className="mt-3 space-y-3 rounded-xl border border-anthracite-100 p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-medium text-anthracite-600">
            Art
            <select name="kind" defaultValue={defaultKind} className="input-field mt-1 py-2 text-sm">
              <option value="anzahlung">Anzahlung</option>
              <option value="rest">Restbetrag</option>
              <option value="gesamt">Gesamtbetrag</option>
              <option value="sonstige">Sonstige</option>
            </select>
          </label>
          <label className="text-xs font-medium text-anthracite-600">
            Rechnungsnr.
            <input name="invoice_number" placeholder="z. B. RE-1042" className="input-field mt-1 py-2 text-sm" />
          </label>
          <label className="text-xs font-medium text-anthracite-600">
            Betrag (€)
            <input name="amount" inputMode="decimal" defaultValue={defaultAmount ?? ""} className="input-field mt-1 py-2 text-sm" />
          </label>
        </div>
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="block w-full text-sm text-anthracite-600 file:mr-3 file:rounded-lg file:border-0 file:bg-anthracite-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
        />
        <label className="flex items-center gap-2 text-sm text-anthracite-700">
          <input type="checkbox" name="send" defaultChecked={hasEmail} disabled={!hasEmail} className="h-4 w-4 accent-gold-600" />
          {hasEmail ? "Direkt per E-Mail an den Kunden schicken (PDF im Anhang)" : "Keine E-Mail-Adresse hinterlegt – nur im Portal ablegen"}
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">✓ Rechnung gespeichert – Status siehe Liste oben.</p>}
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-lg bg-anthracite-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-anthracite-700 disabled:opacity-50">
      {pending ? "Wird hochgeladen …" : "Rechnung hochladen"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { retryVbInvoice } from "@/app/actions/admin-visionbooth";

/** Rechnung für eine bezahlte Bestellung (erneut) in Lexware erstellen. */
export function VbInvoiceRetry({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Rechnung jetzt in Lexware erstellen und an den Kunden schicken?")) return;
          start(async () => {
            const r = await retryVbInvoice(orderId);
            setMsg(r.error ?? "Erstellt ✓");
          });
        }}
        className="rounded-lg bg-anthracite-900 px-3 py-1.5 text-white hover:bg-anthracite-700 disabled:opacity-60"
      >
        {pending ? "Wird erstellt …" : "🧾 Rechnung erstellen"}
      </button>
      {msg && <span className="text-xs text-anthracite-500">{msg}</span>}
    </span>
  );
}

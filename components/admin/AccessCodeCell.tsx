"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateAccessCode } from "@/app/actions/admin-inquiries";

/**
 * Zeigt den zufälligen Zugangscode einer Buchung an – mit Kopieren,
 * vorformulierter WhatsApp-Nachricht und "Neu erzeugen".
 */
export function AccessCodeCell({
  bookingId,
  code,
  customerName,
  phone,
}: {
  bookingId: string;
  code: string | null;
  customerName: string;
  phone: string | null;
}) {
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Erst beim Klick zusammensetzen (window.location ist beim Server-Rendering nicht verfügbar).
  function sendWhatsApp() {
    const message = `Hallo ${customerName}, dein persönlicher Zugangscode für das Event Vision Media Kundenportal lautet: ${current}\n${window.location.origin}`;
    const waNumber = phone ? phone.replace(/[^\d+]/g, "").replace(/^0/, "49").replace(/^\+/, "") : "";
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function copy() {
    if (!current) return;
    navigator.clipboard.writeText(current).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function regenerate() {
    if (!confirm("Neuen Zugangscode erzeugen? Der bisherige Code funktioniert danach nicht mehr.")) return;
    setError(null);
    startTransition(async () => {
      const res = await regenerateAccessCode(bookingId);
      if (res.error || !res.code) return setError(res.error ?? "Fehler");
      setCurrent(res.code);
      router.refresh();
    });
  }

  if (!current) return <span className="text-xs text-anthracite-400">– (Migration 0021 fehlt)</span>;

  return (
    <div className="space-y-1.5">
      <div className="font-mono text-sm font-semibold tracking-wider text-anthracite-800">{current}</div>
      <div className="flex flex-wrap gap-3 text-xs">
        <button type="button" onClick={copy} className="font-medium text-gold-700 hover:text-gold-800">
          {copied ? "✓ Kopiert" : "Kopieren"}
        </button>
        <button type="button" onClick={sendWhatsApp} className="font-medium text-emerald-600 hover:text-emerald-800">
          Per WhatsApp senden
        </button>
        <button type="button" onClick={regenerate} disabled={isPending} className="text-anthracite-400 hover:text-anthracite-700">
          {isPending ? "…" : "Neu erzeugen"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

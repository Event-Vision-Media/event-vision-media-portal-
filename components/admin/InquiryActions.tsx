"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmInquiry, declineInquiry } from "@/app/actions/admin-inquiries";
import { Button } from "@/components/ui/Button";
import { OfferForm } from "@/components/admin/OfferForm";

type OfferProps = { baseTotal: number; isFromPrice: boolean; lines: { label: string; amount: number }[]; question: string | null; sent: boolean; eventDate?: string | null };

export function InquiryActions({ bookingId, hasEmail, offer }: { bookingId: string; hasEmail: boolean; offer?: OfferProps | null }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [needsForce, setNeedsForce] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sendDeclineMail, setSendDeclineMail] = useState(true);
  const router = useRouter();

  function confirm(force = false) {
    startTransition(async () => {
      const res = await confirmInquiry(bookingId, force);
      if (res.error) {
        setMessage({ tone: "error", text: res.error });
        setNeedsForce(res.error.includes("Trotzdem"));
        return;
      }
      setMessage({ tone: "ok", text: res.mailSent ? "Bestätigt – Auftragsbestätigung verschickt." : "Bestätigt (keine E-Mail verschickt)." });
      router.refresh();
    });
  }

  function decline() {
    startTransition(async () => {
      const res = await declineInquiry(bookingId, sendDeclineMail, reason);
      if (res.error) return setMessage({ tone: "error", text: res.error });
      setMessage({ tone: "ok", text: res.mailSent ? "Abgelehnt – Absage verschickt." : "Abgelehnt." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {offer && hasEmail && (
          <Button type="button" variant="primary" disabled={isPending} onClick={() => { setOfferOpen((o) => !o); setDeclineOpen(false); }}>
            {offer.sent ? "✉️ Neues Angebot senden" : "✉️ Angebot senden"}
          </Button>
        )}
        <Button type="button" variant={offer && hasEmail ? "ghost" : "secondary"} disabled={isPending} onClick={() => confirm(false)}>
          {isPending ? "Wird gespeichert…" : offer && hasEmail ? "Ohne Angebot direkt bestätigen" : "✓ Bestätigen & Auftragsbestätigung senden"}
        </Button>
        {needsForce && (
          <Button type="button" variant="primary" disabled={isPending} onClick={() => confirm(true)}>
            Trotzdem bestätigen
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={isPending} onClick={() => { setDeclineOpen((o) => !o); setOfferOpen(false); }}>
          Ablehnen
        </Button>
      </div>
      {offer && hasEmail && !offer.sent && !offerOpen && (
        <p className="text-xs text-anthracite-500">Standard: Angebot senden – nimmt der Kunde an, geht die Auftragsbestätigung automatisch raus. „Direkt bestätigen“ z. B. für Stammkunden.</p>
      )}

      {offerOpen && offer && (
        <OfferForm bookingId={bookingId} baseTotal={offer.baseTotal} isFromPrice={offer.isFromPrice} lines={offer.lines} question={offer.question} eventDate={offer.eventDate ?? null} onDone={() => setOfferOpen(false)} />
      )}

      {declineOpen && (
        <div className="space-y-2 rounded-xl border border-anthracite-100 bg-anthracite-50/60 p-3">
          <textarea
            className="input-field min-h-[70px] text-sm"
            placeholder="Optionaler Hinweis für die Absage, z. B. „An dem Tag ist leider schon alles ausgebucht.“"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {hasEmail && (
            <label className="flex items-center gap-2 text-sm text-anthracite-600">
              <input type="checkbox" checked={sendDeclineMail} onChange={(e) => setSendDeclineMail(e.target.checked)} />
              Freundliche Absage per E-Mail senden
            </label>
          )}
          <Button type="button" variant="primary" disabled={isPending} onClick={decline}>
            Anfrage ablehnen
          </Button>
        </div>
      )}

      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

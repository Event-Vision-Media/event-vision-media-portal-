"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmInquiry, declineInquiry } from "@/app/actions/admin-inquiries";
import { Button } from "@/components/ui/Button";

export function InquiryActions({ bookingId, hasEmail }: { bookingId: string; hasEmail: boolean }) {
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
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => confirm(false)}>
          {isPending ? "Wird gespeichert…" : "✓ Bestätigen & Auftragsbestätigung senden"}
        </Button>
        {needsForce && (
          <Button type="button" variant="primary" disabled={isPending} onClick={() => confirm(true)}>
            Trotzdem bestätigen
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={isPending} onClick={() => setDeclineOpen((o) => !o)}>
          Ablehnen
        </Button>
      </div>

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

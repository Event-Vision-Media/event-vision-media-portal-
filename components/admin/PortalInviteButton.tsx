"use client";

import { useState, useTransition } from "react";
import { sendPortalInvite } from "@/app/actions/admin-inquiries";
import { Button } from "@/components/ui/Button";

/** Portal-Zugang per Mail schicken – bei Bestandsbuchungen der erste Kontakt übers Portal. */
export function PortalInviteButton({ bookingId, email, pending }: { bookingId: string; email: string; pending: boolean }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="mt-4 border-t border-anthracite-100 pt-3">
      <Button
        type="button"
        variant={pending ? "secondary" : "ghost"}
        disabled={busy}
        onClick={() => {
          if (!confirm(`Portal-Zugang jetzt an ${email} schicken?`)) return;
          start(async () => {
            const r = await sendPortalInvite(bookingId);
            setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `Verschickt an ${email} ✓` });
          });
        }}
      >
        {busy ? "Wird verschickt …" : pending ? "Portal-Zugang senden" : "Portal-Zugang erneut senden"}
      </Button>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      {pending && !msg && <p className="mt-2 text-xs text-anthracite-500">Bis du den Zugang schickst, bekommt der Kunde keine automatischen Mails.</p>}
    </div>
  );
}

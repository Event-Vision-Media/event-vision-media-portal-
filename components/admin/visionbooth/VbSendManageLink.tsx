"use client";

import { useState, useTransition } from "react";
import { sendVbManageLink } from "@/app/actions/admin-visionbooth";

/** Kunden-Link per Mail schicken (mit Rückfrage). */
export function VbSendManageLink({ eventId, email }: { eventId: string; email: string | null }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy || !email}
        title={email ? undefined : "Erst die E-Mail des Kunden eintragen"}
        onClick={() => {
          if (!confirm(`Kunden-Link jetzt an ${email} schicken?`)) return;
          start(async () => {
            const r = await sendVbManageLink(eventId);
            setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Verschickt ✓" });
          });
        }}
        className="rounded-lg bg-anthracite-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-anthracite-700 disabled:opacity-40"
      >
        {busy ? "Sendet …" : "Per Mail an Kunden"}
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </span>
  );
}

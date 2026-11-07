"use client";

import { useState, useTransition } from "react";
import { markFullyPaid } from "@/app/actions/payments";

/** „Gesamtbetrag erhalten“ mit optionaler Zahlungsbestätigung per E-Mail (bzw. nur die Mail erneut senden). */
export function FullPaymentButton({ bookingId, allPaid, email }: { bookingId: string; allPaid: boolean; email: string | null }) {
  const [sendMail, setSendMail] = useState(Boolean(email));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(onlyMail: boolean) {
    const mail = onlyMail || sendMail;
    if (mail && !confirm(`Zahlungsbestätigung jetzt an ${email} schicken?`)) return;
    setMsg(null);
    start(async () => {
      const r = await markFullyPaid(bookingId, mail, onlyMail);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.mailSent ? `Bestätigung an ${email} verschickt ✓` : "Als vollständig bezahlt markiert ✓" });
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-anthracite-100 bg-sand-50 p-3">
      {!allPaid ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => run(false)} disabled={pending} className="rounded-full bg-anthracite-900 px-4 py-2 text-sm font-medium text-white hover:bg-anthracite-700 disabled:opacity-60">
            {pending ? "Speichert …" : "Gesamtbetrag erhalten"}
          </button>
          {email && (
            <label className="flex items-center gap-2 text-sm text-anthracite-600">
              <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
              Bestätigung per E-Mail an den Kunden
            </label>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-emerald-700">✓ Vollständig bezahlt</span>
          {email && (
            <button type="button" onClick={() => run(true)} disabled={pending} className="rounded-full border border-anthracite-200 bg-white px-4 py-2 text-sm font-medium text-anthracite-700 hover:border-gold-400 disabled:opacity-60">
              {pending ? "Wird verschickt …" : "Zahlungsbestätigung per E-Mail senden"}
            </button>
          )}
        </div>
      )}
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

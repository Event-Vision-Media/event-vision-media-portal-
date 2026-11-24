"use client";

import { useState, useTransition } from "react";
import { sendLayoutProofsReady } from "@/app/actions/layout-proofs-notify";

/** „Kunde informieren“ für Layout-Entwürfe: eine Mail für alles, was gerade auf Freigabe wartet. */
export function LayoutProofsNotifyCard({
  bookingId,
  email,
  layouts,
  screen,
  revised,
  informedAt,
}: {
  bookingId: string;
  email: string | null;
  layouts: string[];
  screen: boolean;
  revised: boolean;
  informedAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const items = [...layouts.map((l) => `Layout „${l}“`), ...(screen ? ["Persönlicher Startbildschirm"] : [])];
  const ready = items.length > 0;

  function send() {
    if (!email || !ready) return;
    if (!confirm(`${revised ? "Überarbeitete Entwürfe" : "Entwürfe"} zur Ansicht – Mail jetzt an ${email} schicken?\n\n${items.map((i) => `• ${i}`).join("\n")}`)) return;
    setMsg(null);
    start(async () => {
      const r = await sendLayoutProofsReady(bookingId);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `Verschickt: „${r.subject}“ ✓` });
    });
  }

  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50/40 p-4">
      <h3 className="font-medium text-anthracite-800">Kunde informieren</h3>
      <p className="mt-1 text-sm text-anthracite-500">
        Erst alle Entwürfe hochladen, dann eine Mail „{revised ? "Überarbeitet – bitte anschauen" : "Deine Layouts sind da"}“ mit Knopf direkt zur Freigabe im Portal.
      </p>
      {ready ? (
        <ul className="mt-2 space-y-0.5 text-sm text-anthracite-700">
          {items.map((i) => (
            <li key={i}>○ {i} wartet auf Freigabe</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-anthracite-400">Gerade wartet kein Entwurf auf Freigabe.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={pending || !ready || !email}
          className="rounded-full bg-anthracite-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-anthracite-700 disabled:opacity-50"
        >
          {pending ? "Wird verschickt …" : !email ? "Keine E-Mail hinterlegt" : ready ? `Info senden: ${revised ? "überarbeitet" : items.length > 1 ? "Entwürfe sind da" : "Entwurf ist da"}` : "Nichts zu senden"}
        </button>
        {informedAt && <span className="text-xs text-anthracite-500">Zuletzt informiert am {new Date(informedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</span>}
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

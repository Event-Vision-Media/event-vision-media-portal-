"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { offerOpened, respondToOffer } from "@/app/actions/offer-response";

type Mode = null | "aenderung" | "ablehnen";

/** Kunde beantwortet das Angebot: annehmen (→ Auftragsbestätigung), Änderung wünschen oder ablehnen. */
export function OfferResponse({ token, sie }: { token: string; sie: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // „Angesehen“ erst im Browser – Mail-Scanner, die den Link vorab abrufen, zählen nicht
  useEffect(() => {
    offerOpened(token).catch(() => {});
  }, [token]);

  function send(answer: "annehmen" | "aenderung" | "ablehnen") {
    setError(null);
    start(async () => {
      const r = await respondToOffer(token, answer, answer === "annehmen" ? "" : note);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => send("annehmen")}
        className="w-full rounded-2xl bg-gradient-to-b from-gold-500 to-gold-600 px-5 py-4 text-base font-semibold text-white shadow-glow transition hover:brightness-105 disabled:opacity-60"
      >
        {pending && !mode ? "Wird bestätigt…" : "✓ Angebot annehmen"}
      </button>
      <p className="text-center text-xs text-anthracite-400">
        {sie
          ? "Danach erhalten Sie sofort die Auftragsbestätigung mit Ihrem Zugang zum Kundenportal. Dort unterschreiben Sie den Mietvertrag."
          : "Danach bekommst du sofort die Auftragsbestätigung mit deinem Zugang zum Kundenportal. Dort unterschreibst du den Mietvertrag."}
      </p>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => setMode(mode === "aenderung" ? null : "aenderung")}
          className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${mode === "aenderung" ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 text-anthracite-700 hover:border-gold-300"}`}
        >
          ✏️ Änderung wünschen
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "ablehnen" ? null : "ablehnen")}
          className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${mode === "ablehnen" ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 text-anthracite-500 hover:border-gold-300"}`}
        >
          Ablehnen
        </button>
      </div>

      {mode && (
        <div className="space-y-2 rounded-2xl border border-anthracite-100 bg-sand-50 p-4">
          <label htmlFor="offer-note" className="block text-sm font-medium text-anthracite-700">
            {mode === "aenderung" ? (sie ? "Was dürfen wir für Sie ändern?" : "Was sollen wir ändern?") : sie ? "Möchten Sie uns kurz sagen, warum? (optional)" : "Magst du uns kurz sagen, warum? (optional)"}
          </label>
          <textarea
            id="offer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            className="input-field text-sm"
            placeholder={mode === "aenderung" ? "z. B. Lieber ohne Requisiten-Box, dafür eine Stunde länger." : "z. B. Wir haben uns für etwas anderes entschieden."}
          />
          <button
            type="button"
            disabled={pending || (mode === "aenderung" && !note.trim())}
            onClick={() => send(mode)}
            className="w-full rounded-xl bg-anthracite-800 px-4 py-3 text-sm font-medium text-white hover:bg-anthracite-700 disabled:opacity-50"
          >
            {pending ? "Wird gesendet…" : mode === "aenderung" ? "Änderungswunsch senden" : "Angebot ablehnen"}
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

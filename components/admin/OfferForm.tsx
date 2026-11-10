"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewOffer, sendOffer } from "@/app/actions/admin-offers";
import { Button } from "@/components/ui/Button";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const toNum = (s: string) => Number(s.replace(",", "."));
type Row = { label: string; amount: string };

/**
 * Angebot an eine Anfrage: Antwort auf die Rückfrage, zusätzliche Positionen (+/−) und Gültigkeit.
 * Nimmt der Kunde an, wird die Buchung automatisch bestätigt.
 */
export function OfferForm({
  bookingId,
  baseTotal,
  isFromPrice,
  lines,
  question,
  eventDate = null,
  onDone,
}: {
  bookingId: string;
  /** Gesamtpreis ohne Angebots-Positionen */
  baseTotal: number;
  isFromPrice: boolean;
  lines: { label: string; amount: number }[];
  question: string | null;
  /** Für kurzfristige Events kürzere Gültigkeit vorschlagen */
  eventDate?: string | null;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<Row[]>(lines.length ? lines.map((l) => ({ label: l.label, amount: String(l.amount).replace(".", ",") })) : [{ label: "", amount: "" }]);
  // Kurzfristig (Event in weniger als 10 Tagen): 3 Tage Gültigkeit vorschlagen
  const daysToEvent = eventDate ? Math.round((Date.parse(eventDate) - Date.now()) / 86_400_000) : 99;
  const [days, setDays] = useState(daysToEvent < 10 ? 3 : 7);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<{ subject: string; html: string; to?: string } | null>(null);
  const [loadingPreview, startPreview] = useTransition();
  const router = useRouter();

  const valid = rows.filter((r) => r.label.trim() && Number.isFinite(toNum(r.amount)) && toNum(r.amount) !== 0);
  const total = Math.max(0, baseTotal + valid.reduce((s, r) => s + toNum(r.amount), 0));
  const set = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  function submit() {
    setError(null);
    start(async () => {
      const r = await sendOffer(bookingId, { message, lines: valid, days });
      if (r.error) return setError(r.error);
      onDone();
      router.refresh();
    });
  }

  function showPreview() {
    setError(null);
    startPreview(async () => {
      const r = await previewOffer(bookingId, { message, lines: valid, days });
      if (r.error || !r.html) return setError(r.error ?? "Vorschau konnte nicht erstellt werden.");
      setPreview({ subject: r.subject ?? "", html: r.html, to: r.to });
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-gold-200 bg-gold-50/50 p-4">
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Vorschau der Angebots-Mail" onClick={() => setPreview(null)}>
          <div className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[88vh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-anthracite-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Vorschau – noch nicht gesendet</p>
              <p className="mt-1 text-sm text-anthracite-500">
                An: <span className="text-anthracite-800">{preview.to ?? "–"}</span>
              </p>
              <p className="text-sm text-anthracite-500">
                Betreff: <span className="font-medium text-anthracite-800">{preview.subject}</span>
              </p>
            </div>
            <iframe title="Angebots-Mail" srcDoc={preview.html} sandbox="" className="w-full flex-1 bg-white" />
            <div className="flex flex-wrap gap-2 border-t border-anthracite-100 px-5 py-4">
              <Button
                type="button"
                disabled={pending || !message.trim()}
                onClick={() => {
                  setPreview(null);
                  submit();
                }}
              >
                ✉️ So senden
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
                Zurück zum Bearbeiten
              </Button>
              {!message.trim() && <p className="w-full text-xs text-red-600">Zum Senden fehlt noch deine Nachricht an den Kunden.</p>}
            </div>
          </div>
        </div>
      )}
      {question && (
        <div className="rounded-lg bg-white p-3 text-sm text-anthracite-600">
          <p className="mb-1 text-xs font-semibold text-anthracite-400">💬 Frage / Notiz des Kunden</p>
          <p className="whitespace-pre-wrap">{question}</p>
        </div>
      )}

      <div>
        <label htmlFor={`offer-msg-${bookingId}`} className="mb-1 block text-sm font-medium text-anthracite-700">
          Deine Antwort an den Kunden
        </label>
        <textarea
          id={`offer-msg-${bookingId}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={3000}
          className="input-field text-sm"
          placeholder="z. B. Gern! Eine Verlängerung um 2 Stunden ist möglich – die habe ich dir unten mit eingerechnet. Die Lieferung nach Köln ist ebenfalls kein Problem."
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-anthracite-700">
          Zusätzliche Positionen <span className="font-normal text-anthracite-400">(optional, Minus = Nachlass)</span>
        </p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input value={r.label} onChange={(e) => set(i, "label", e.target.value)} maxLength={80} placeholder="z. B. 2 Zusatzstunden" className="input-field flex-1 text-sm" aria-label="Bezeichnung" />
              <input value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} inputMode="decimal" placeholder="€" className="input-field w-24 text-sm" aria-label="Betrag in Euro" />
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-anthracite-400 hover:text-anthracite-700" aria-label="Position entfernen">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {rows.length < 5 && (
          <button type="button" onClick={() => setRows([...rows, { label: "", amount: "" }])} className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-800">
            + weitere Position
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-anthracite-700">Gültig</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-field w-36 text-sm">
            <option value={3}>3 Tage</option>
            <option value={7}>7 Tage</option>
            <option value={14}>14 Tage</option>
          </select>
        </label>
        <div className="text-right">
          <p className="text-xs text-anthracite-400">Neuer Gesamtpreis</p>
          <p className="font-serif text-2xl font-semibold text-anthracite-800">
            {isFromPrice ? "ab " : ""}
            {eur(total)}
          </p>
        </div>
      </div>

      <p className="text-xs text-anthracite-500">
        Der Kunde bekommt eine Mail mit Link zum Angebot. Nimmt er an, wird die Buchung <strong>automatisch bestätigt</strong> (Auftragsbestätigung mit Portal-Zugang). Nach 3 Tagen ohne Antwort kommt eine Erinnerung, nach Ablauf wird der Termin frei.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending || !message.trim()} onClick={submit}>
          {pending ? "Wird gesendet…" : "✉️ Angebot senden"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending || loadingPreview} onClick={showPreview}>
          {loadingPreview ? "Lädt…" : "👁 Vorschau"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

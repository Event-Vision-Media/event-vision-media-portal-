"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { releaseBooking } from "@/app/actions/admin-release";
import { previewPersonalMail } from "@/app/actions/personal-mail";

/**
 * Bestätigte Buchung ohne Vertrag stornieren und den Termin freigeben – mit optionaler
 * Freigabe-Mail (Vorlage „Termin freigeben“, vor dem Senden änderbar und als Vorschau sichtbar).
 */
export function ReleaseBookingCard({
  bookingId,
  email,
  eventDateLabel,
  template,
}: {
  bookingId: string;
  email: string | null;
  eventDateLabel: string;
  template: { subject: string; body: string };
}) {
  const [open, setOpen] = useState(false);
  const [withMail, setWithMail] = useState(Boolean(email));
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function showPreview() {
    setError(null);
    start(async () => {
      const r = await previewPersonalMail(bookingId, subject, body, false);
      if (r.error || !r.html) return setError(r.error ?? "Vorschau nicht möglich.");
      setPreview(r.html);
    });
  }

  function release() {
    if (!window.confirm(`Buchung wirklich stornieren und den Termin am ${eventDateLabel} freigeben?${withMail ? "\n\nDie Freigabe-Mail geht sofort an " + email + "." : ""}`)) return;
    setError(null);
    start(async () => {
      const r = await releaseBooking(bookingId, withMail ? { subject, body } : null);
      if (r.error) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-anthracite-400 underline-offset-4 hover:text-red-700 hover:underline">
          Kunde meldet sich nicht? Buchung stornieren & Termin freigeben
        </button>
      </div>
    );
  }

  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">Buchung stornieren & Termin freigeben</h2>
      <p className="mt-1 text-sm text-anthracite-600">
        Für Buchungen ohne unterschriebenen Vertrag und ohne Zahlung. Danach ist der Termin am {eventDateLabel} wieder frei, das Kundenportal ist geschlossen und es gehen keine automatischen
        Erinnerungen mehr raus. Die Buchung findest du dann unter „Abgelehnt“.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm text-anthracite-700">
        <input type="checkbox" checked={withMail} disabled={!email} onChange={(e) => setWithMail(e.target.checked)} className="h-4 w-4 accent-gold-600" />
        Freigabe-Mail an {email ?? "den Kunden"} schicken {!email && <span className="text-anthracite-400">(keine E-Mail hinterlegt)</span>}
      </label>

      {withMail && (
        <div className="mt-3 space-y-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="input-field text-sm" aria-label="Betreff" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={8000} className="input-field text-sm" aria-label="Text der Mail" />
          <button type="button" onClick={showPreview} disabled={pending} className="text-xs font-medium text-gold-700 hover:text-gold-800">
            👁 Vorschau ansehen
          </button>
          {preview && <iframe title="Vorschau der Freigabe-Mail" srcDoc={preview} sandbox="" className="h-[480px] w-full rounded-xl border border-anthracite-100 bg-white" />}
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={release} disabled={pending} className="!bg-red-700 hover:!bg-red-800">
          {pending ? "Wird ausgeführt…" : withMail ? "Termin freigeben & Mail senden" : "Termin freigeben (ohne Mail)"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </Card>
  );
}

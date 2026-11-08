"use client";

import { useState, useTransition } from "react";
import { previewPersonalMail, sendPersonalMail } from "@/app/actions/personal-mail";
import { Card } from "@/components/ui/Card";
import { PERSONAL_TEMPLATES, buildPersonalMail, templateWantsPortal, type PersonalMailFacts, type PersonalTemplateId } from "@/lib/personal-mail";

export interface PersonalMailHistoryView {
  id: string;
  subject: string;
  sentAt: string;
  test: boolean;
  delivery: string | null;
  clickedAt: string | null;
}

const DELIVERY: Record<string, { text: string; tone: string }> = {
  delivered: { text: "zugestellt ✓", tone: "text-emerald-700" },
  opened: { text: "zugestellt ✓", tone: "text-emerald-700" },
  clicked: { text: "zugestellt ✓", tone: "text-emerald-700" },
  sent: { text: "unterwegs", tone: "text-anthracite-500" },
  delivery_delayed: { text: "Zustellung verzögert", tone: "text-amber-700" },
  bounced: { text: "nicht zustellbar – Adresse prüfen!", tone: "text-red-700" },
  complained: { text: "als Spam markiert", tone: "text-red-700" },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Persönliche Nachricht an den Kunden – mit Vorlagen, Vorschau und Verlauf (zugestellt / Link geöffnet). */
export function PersonalMailCard({
  bookingId,
  email,
  facts,
  history,
}: {
  bookingId: string;
  email: string | null;
  facts: PersonalMailFacts;
  history: PersonalMailHistoryView[];
}) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<PersonalTemplateId>("rueckmeldung");
  const initial = buildPersonalMail("rueckmeldung", facts);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [withPortal, setWithPortal] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function choose(id: PersonalTemplateId) {
    const dirty = body !== buildPersonalMail(tpl, facts).body || subject !== buildPersonalMail(tpl, facts).subject;
    if (dirty && !confirm("Deine Änderungen am Text gehen verloren. Vorlage trotzdem wechseln?")) return;
    const m = buildPersonalMail(id, facts);
    setTpl(id);
    setSubject(m.subject);
    setBody(m.body);
    setWithPortal(templateWantsPortal(id));
    setPreview(null);
    setMsg(null);
  }

  function showPreview() {
    setMsg(null);
    start(async () => {
      const r = await previewPersonalMail(bookingId, subject, body, withPortal);
      if (r.error) setMsg({ ok: false, text: r.error });
      else setPreview(r.html ?? null);
    });
  }

  function send() {
    if (!email) return;
    if (!confirm(`Nachricht „${subject}“ jetzt an ${email} schicken?`)) return;
    setMsg(null);
    start(async () => {
      const r = await sendPersonalMail(bookingId, subject, body, withPortal);
      if (r.error) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: r.test ? "Test: gespeichert, aber nicht verschickt (lokal kein Mailversand)." : "Verschickt ✓ – Antworten landen in deinem Postfach." });
      setOpen(false);
      setPreview(null);
    });
  }

  return (
    <Card>
      <div id="nachricht" className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">Persönliche Nachricht</h2>
          <p className="mt-1 text-sm text-anthracite-500">
            Für Fälle, in denen die automatischen Mails nicht reichen – z. B. wenn der Kunde nicht reagiert.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!email}
            className="rounded-full bg-anthracite-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-anthracite-700 disabled:opacity-50"
          >
            Nachricht schreiben
          </button>
        )}
      </div>
      {!email && <p className="mt-2 text-sm text-amber-700">Keine E-Mail-Adresse hinterlegt.</p>}

      {open && (
        <div className="mt-4 space-y-4">
          {facts.openItems.length > 0 && (
            <div className="rounded-xl bg-sand-50 p-3 text-sm text-anthracite-600">
              <p className="font-medium text-anthracite-700">Noch offen bei dieser Buchung:</p>
              <ul className="mt-1 list-disc pl-5">
                {facts.openItems.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-anthracite-500">Vorlage</p>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.hint}
                  onClick={() => choose(t.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                    t.id === tpl ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-anthracite-400">{PERSONAL_TEMPLATES.find((t) => t.id === tpl)?.hint}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-anthracite-500">Betreff</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="w-full rounded-xl border border-anthracite-200 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-anthracite-500">Text</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-anthracite-200 px-3 py-2 font-sans text-sm leading-relaxed focus:border-gold-400 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-anthracite-400">Leerzeile = neuer Absatz · Zeilen mit „– “ werden zur Liste. Alles frei änderbar.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-anthracite-700">
            <input type="checkbox" checked={withPortal} onChange={(e) => setWithPortal(e.target.checked)} className="mt-0.5" />
            <span>
              Knopf „Zum Kundenportal“ mit Zugangscode anhängen
              <span className="block text-xs text-anthracite-400">Darüber siehst du, ob und wann der Kunde die Nachricht geöffnet hat.</span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={pending || !email}
              className="rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-gold-500 hover:to-gold-700 disabled:opacity-50"
            >
              {pending ? "Bitte warten …" : `An ${email ?? "–"} senden`}
            </button>
            <button type="button" onClick={showPreview} disabled={pending} className="rounded-full border border-anthracite-200 px-5 py-2.5 text-sm text-anthracite-700 hover:border-gold-300">
              Vorschau
            </button>
            <button type="button" onClick={() => { setOpen(false); setPreview(null); }} className="text-sm text-anthracite-500 hover:text-anthracite-800">
              Abbrechen
            </button>
          </div>
          {preview && (
            <iframe title="Vorschau der Nachricht" srcDoc={preview} sandbox="" className="h-[560px] w-full rounded-xl border border-anthracite-100 bg-white" />
          )}
        </div>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}

      {history.length > 0 && (
        <div className="mt-5 border-t border-anthracite-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-anthracite-500">Bisher verschickt</p>
          <ul className="space-y-3">
            {history.map((h) => {
              const d = h.delivery ? DELIVERY[h.delivery] ?? { text: h.delivery, tone: "text-anthracite-500" } : null;
              return (
                <li key={h.id} className="text-sm">
                  <p className="font-medium text-anthracite-800">„{h.subject}“</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    <span className="text-anthracite-500">📨 verschickt {when(h.sentAt)}</span>
                    {h.test ? <span className="text-amber-700">Test – nicht wirklich verschickt</span> : d && <span className={d.tone}>{d.text}</span>}
                    {h.clickedAt ? (
                      <span className="font-medium text-emerald-700">👆 Link geöffnet {when(h.clickedAt)}</span>
                    ) : (
                      <span className="text-anthracite-400">Link noch nicht geöffnet</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

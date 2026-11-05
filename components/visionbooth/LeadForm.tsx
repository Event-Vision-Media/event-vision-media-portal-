"use client";

import { useState } from "react";
import type { LeadField } from "./leads";

interface Lead {
  title: string;
  text: string;
  fields: LeadField[];
  consent: string;
  marketing: string | null;
  privacyUrl: string;
  sponsor: string;
}

const INPUT = "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-[16px] text-white outline-none placeholder:text-white/35 focus:border-[color:var(--a)]";

/** Einladung im Ergebnis-Schritt – freiwillig, das Foto gibt es sowieso. */
export function LeadTeaser({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="vb-in relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--a) 30%, #141417), #141417)", border: "1px solid color-mix(in srgb, var(--a) 45%, transparent)" }}>
      <span className="vb-shimmer pointer-events-none absolute inset-0 opacity-40" />
      <span className="relative text-3xl">🎁</span>
      <span className="relative flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{lead.title}</span>
        {lead.text && <span className="mt-0.5 block text-xs leading-snug text-white/65">{lead.text}</span>}
      </span>
      <span className="relative text-xl text-white/60">›</span>
    </button>
  );
}

export function LeadFormView({ slug, guest, lead, onDone }: { slug: string; guest: string; lead: Lead; onDone: () => void }) {
  const [v, setV] = useState({ name: "", email: "", company: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const has = (f: LeadField) => lead.fields.includes(f);

  if (ok) {
    return (
      <div className="py-6 text-center">
        <p className="vb-points text-6xl">🎉</p>
        <p className="vb-display mt-3 text-2xl font-semibold">Du bist dabei!</p>
        <p className="mt-1 text-sm text-white/65">Danke fürs Mitmachen – viel Glück!</p>
        <button onClick={onDone} className="vb-btn mt-6 w-full rounded-full py-4 font-bold">
          Weiter
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/vb/${slug}/lead`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-vb-guest": guest },
          body: JSON.stringify({ ...v, consent, marketing }),
        }).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        setBusy(false);
        if (!res?.ok) return setError(data?.error || "Das hat nicht geklappt – bitte nochmal versuchen.");
        try {
          localStorage.setItem(`vb-lead-${slug}`, "1");
        } catch {
          /* privates Surfen */
        }
        setOk(true);
      }}
      className="space-y-3"
    >
      <p className="text-4xl">🎁</p>
      <p className="vb-display text-2xl font-semibold leading-tight">{lead.title}</p>
      {lead.text && <p className="text-[13px] text-white/65">{lead.text}</p>}
      <div className="space-y-2.5 pt-2">
        {has("name") && <input className={INPUT} placeholder="Vor- und Nachname" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required maxLength={120} />}
        <input className={INPUT} type="email" inputMode="email" placeholder="E-Mail-Adresse" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required maxLength={200} />
        {has("company") && <input className={INPUT} placeholder="Firma (optional)" autoComplete="organization" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} maxLength={120} />}
        {has("phone") && <input className={INPUT} type="tel" placeholder="Telefon (optional)" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={40} />}
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-white/5 px-3.5 py-3 text-[12px] leading-snug text-white/70">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[color:var(--a)]" />
        <span>{lead.consent}</span>
      </label>
      {lead.marketing && (
        <label className="flex items-start gap-3 rounded-2xl bg-white/5 px-3.5 py-3 text-[12px] leading-snug text-white/70">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[color:var(--a)]" />
          <span>
            {lead.marketing} <span className="text-white/45">(freiwillig)</span>
          </span>
        </label>
      )}
      <p className="text-[11px] leading-snug text-white/45">
        Verantwortlich für deine Angaben ist {lead.sponsor}; VisionBooth speichert sie nur in deren Auftrag.
        {lead.privacyUrl && (
          <>
            {" "}
            <a href={lead.privacyUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Teilnahmebedingungen &amp; Datenschutz
            </a>
          </>
        )}
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button disabled={busy || !consent} className="vb-btn w-full rounded-full py-4 text-[16px] font-bold disabled:opacity-50">
        {busy ? "Wird gesendet …" : "Jetzt mitmachen"}
      </button>
      <p className="text-center text-[11px] text-white/40">Freiwillig – dein Foto bekommst du natürlich auch ohne.</p>
    </form>
  );
}

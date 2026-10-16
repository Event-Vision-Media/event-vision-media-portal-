"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTemplateSubmission } from "@/app/actions/admin-templatesbooth";
import type { TemplateSubmission } from "@/lib/templatesbooth-server";

const dateDE = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-DE") : "–");

/**
 * TemplatesBooth-Einsendungen im Admin. Ohne `bookings` reine Anzeige (bei einer Buchung),
 * mit `bookings` zusätzlich Zuordnen für Einsendungen, die nicht automatisch erkannt wurden.
 */
export function TemplateSubmissions({
  submissions,
  bookings,
  title,
}: {
  submissions: TemplateSubmission[];
  bookings?: { id: string; booking_code: string; couple_names: string }[];
  title: string;
}) {
  if (submissions.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gold-200 bg-white p-4 shadow-card">
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">{title}</h2>
      <p className="mt-0.5 text-xs text-anthracite-400">
        Druckdatei für dslrBooth: TemplatesBooth → Widget Dashboard → Submissions. Danach hier die Vorschau zur Freigabe hochladen.
      </p>
      <ul className="mt-3 space-y-3">
        {submissions.map((s) => (
          <li key={s.id} className="flex gap-3 rounded-xl bg-sand-50 p-3 text-sm">
            {s.preview_url && <img src={s.preview_url} alt="" className="h-20 w-auto shrink-0 rounded bg-white object-contain" loading="lazy" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-anthracite-800">{s.design_name ?? "Design (Name unbekannt)"}</p>
              <p className="text-xs text-anthracite-500">
                {s.customer_name ?? "–"} · {s.email ?? "keine E-Mail"} · Event {dateDE(s.event_date)}
              </p>
              <p className="text-xs text-anthracite-400">
                Eingegangen {dateDE(s.received_at)}
                {s.matched_by && ` · zugeordnet per ${s.matched_by === "code" ? "Buchungscode" : s.matched_by === "email" ? "E-Mail" : "Admin"}`}
              </p>
              {bookings && !s.booking_id && <AssignForm submissionId={s.id} bookings={bookings} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssignForm({ submissionId, bookings }: { submissionId: string; bookings: { id: string; booking_code: string; couple_names: string }[] }) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="input-field max-w-xs py-1.5 text-xs">
        <option value="">Buchung zuordnen…</option>
        {bookings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.booking_code} · {b.couple_names}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!bookingId || isPending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await assignTemplateSubmission(submissionId, bookingId);
            if (r.error) return setError(r.error);
            router.refresh();
          })
        }
        className="rounded-lg bg-anthracite-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {isPending ? "Ordne zu …" : "Zuordnen"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

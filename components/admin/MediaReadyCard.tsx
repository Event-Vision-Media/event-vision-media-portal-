"use client";

import { useState, useTransition } from "react";
import { sendMediaReady } from "@/app/actions/media-ready";
import { Card } from "@/components/ui/Card";

/** „Kunde informieren“: zeigt, was bereitliegt, und schickt per Knopf die passende Mail (Fotos / Audios / beides). */
export function MediaReadyCard({
  bookingId,
  email,
  photoBooked,
  videoBooked,
  audioBooked,
  galleryReady,
  audios,
  informedAt,
}: {
  bookingId: string;
  email: string | null;
  photoBooked: boolean;
  videoBooked: boolean;
  audioBooked: boolean;
  galleryReady: boolean;
  audios: number;
  informedAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const words = [photoBooked && galleryReady && "Fotos", videoBooked && galleryReady && "Videos", audioBooked && audios > 0 && "Audios"].filter(Boolean) as string[];
  const what = words.length ? (words.length > 1 ? `${words.slice(0, -1).join(", ")} & ${words[words.length - 1]}` : words[0]) : null;
  const galleryLabel = photoBooked && videoBooked ? "Fotos & Videos" : videoBooked ? "360°-Videos" : "Fotos";

  function send() {
    if (!email || !what) return;
    if (!confirm(`Info „Deine ${what} sind da“ jetzt an ${email} schicken?`)) return;
    setMsg(null);
    start(async () => {
      const r = await sendMediaReady(bookingId);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `Verschickt: „${r.subject}“ ✓` });
    });
  }

  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">Kunde informieren</h2>
      <p className="mt-1 text-sm text-anthracite-500">Sobald alles hochgeladen ist: eine Mail „Deine {what ?? "Fotos, Videos bzw. Audios"} sind da“ mit Zugang zum Portal.</p>
      <ul className="mt-3 space-y-1 text-sm">
        {(photoBooked || videoBooked) && (
          <li className={galleryReady ? "text-emerald-700" : "text-anthracite-400"}>{galleryReady ? `✓ Online-Galerie (${galleryLabel}) hinterlegt` : `○ Online-Galerie (${galleryLabel}) noch nicht hinterlegt`}</li>
        )}
        {audioBooked && (
          <li className={audios ? "text-emerald-700" : "text-anthracite-400"}>{audios ? `✓ ${audios} Audio-Nachricht${audios === 1 ? "" : "en"} hochgeladen` : "○ Noch keine Audios hochgeladen"}</li>
        )}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={pending || !what || !email}
          className="rounded-full bg-anthracite-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-anthracite-700 disabled:opacity-50"
        >
          {pending ? "Wird verschickt …" : what ? `Info senden: ${what} sind da` : "Noch nichts bereit"}
        </button>
        {informedAt && <span className="text-xs text-anthracite-500">Zuletzt informiert am {new Date(informedAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</span>}
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-anthracite-400">
        Ohne Klick geht 7 Tage nach dem Event automatisch eine Mail raus – aber erst, wenn alles Gebuchte hochgeladen ist (spätestens nach 14 Tagen als Dankeschön). Hast du schon informiert, enthält sie nur noch Danke + Bitte um Bewertung.
      </p>
    </Card>
  );
}

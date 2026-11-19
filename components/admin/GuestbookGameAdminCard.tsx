"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGuestbookGameEnabled } from "@/app/actions/guestbook-game";

/** Admin: Status des Gästebuch-Spiels, Links zu Spiel und Druckvorlage, Freischaltung ohne Aufpreis. */
export function GuestbookGameAdminCard({
  bookingId,
  source,
  adminEnabled,
  title,
  gameHref,
  spins,
  customTasks,
}: {
  bookingId: string;
  /** Warum aktiv: "paket" | "extra" | "admin" | null (nicht aktiv) */
  source: "paket" | "extra" | "admin" | null;
  adminEnabled: boolean;
  title: string | null;
  gameHref: string | null;
  spins: number;
  customTasks: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const status =
    source === "paket" ? "Im Paket enthalten (Komfort/Premium)"
    : source === "extra" ? "Als Extra gebucht"
    : source === "admin" ? "Ohne Aufpreis freigeschaltet"
    : "Nicht gebucht – Kunde sieht im Portal „Dazubuchen · 10 €“";

  function toggle() {
    setError(null);
    start(async () => {
      const res = await setGuestbookGameEnabled(bookingId, !adminEnabled);
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-anthracite-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-anthracite-800">Gästebuch-Spiel</p>
          <p className={`text-sm ${source ? "text-emerald-700" : "text-anthracite-500"}`}>{status}</p>
        </div>
        {source && (
          <div className="flex flex-wrap gap-2 text-sm">
            {gameHref && <a href={gameHref} target="_blank" rel="noopener" className="rounded-lg border border-anthracite-200 px-3 py-1.5 hover:bg-sand-50">Spiel öffnen ↗</a>}
            <a href={`/admin/bookings/${bookingId}/spielkarte`} className="rounded-lg bg-anthracite-800 px-3 py-1.5 text-white hover:bg-anthracite-700">QR-Aufsteller drucken</a>
          </div>
        )}
      </div>
      {source && (
        <p className="mt-2 text-xs text-anthracite-500">
          {title ? <>Überschrift: „{title}“ · </> : null}
          {customTasks ? `${customTasks} eigene Aufgabe${customTasks === 1 ? "" : "n"}` : "keine eigenen Aufgaben"} · {spins}× gedreht
        </p>
      )}
      {(source === null || source === "admin") && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-anthracite-600">
          <input type="checkbox" checked={adminEnabled} onChange={toggle} disabled={pending} className="h-4 w-4 accent-gold-600" />
          Ohne Aufpreis freischalten (z. B. Kulanz oder ältere Buchung)
        </label>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

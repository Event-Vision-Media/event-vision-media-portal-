"use client";

import { useState, useTransition } from "react";
import { lexwareDraftTest } from "@/app/actions/admin-visionbooth";

/** Probe-Entwurf in Lexware – prüft Verbindung und Rechnungstext, ohne Rechnungsnummer zu verbrauchen. */
export function VbLexwareDraftTest() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-dashed border-anthracite-200 bg-white p-4 text-sm">
      <p className="font-semibold text-anthracite-800">Probe: Rechnungs-Entwurf in Lexware</p>
      <p className="mt-1 text-anthracite-500">
        Legt einen <strong>Entwurf</strong> mit Beispieldaten an – ohne Rechnungsnummer, nicht festgeschrieben. In Lexware unter Rechnungen → Entwürfe prüfen
        (Text, Betrag, Leistungsdatum, Kleinunternehmer-Hinweis) und danach löschen.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMsg((await lexwareDraftTest()).error ?? "Entwurf angelegt ✓ – jetzt in Lexware prüfen und löschen."))}
        className="mt-3 rounded-lg bg-anthracite-900 px-3 py-1.5 text-white hover:bg-anthracite-700 disabled:opacity-60"
      >
        {pending ? "Wird angelegt …" : "Probe-Entwurf anlegen"}
      </button>
      {msg && <p className="mt-2 text-xs text-anthracite-600">{msg}</p>}
    </div>
  );
}

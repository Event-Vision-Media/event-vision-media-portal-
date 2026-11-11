"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { greetingLine, usesSie } from "@/lib/address";
import { setAddressing } from "@/app/actions/admin-address";

/** Wie der Kunde angesprochen wird – gilt für alle Mails, persönliche Nachrichten, Portal und Angebot. */
export function AddressingCard({
  bookingId,
  customerType,
  name,
  addressForm,
  salutation,
}: {
  bookingId: string;
  customerType: string | null;
  name: string;
  addressForm: string | null;
  salutation: string | null;
}) {
  const [form, setForm] = useState(addressForm ?? "auto");
  const [sal, setSal] = useState(salutation ?? "");
  const [who, setWho] = useState(name);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const preview = { customer_type: customerType, address_form: form === "auto" ? null : form, salutation: sal || null, customer_name: who };
  const changed = form !== (addressForm ?? "auto") || sal !== (salutation ?? "") || who.trim() !== name.trim();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await setAddressing(bookingId, form, sal, who.trim() !== name.trim() ? who : undefined);
      if (r.error) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">Ansprache</h2>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-anthracite-700">Name (Vor- und Nachname)</span>
        <input value={who} onChange={(e) => { setWho(e.target.value); setSaved(false); }} maxLength={120} className="input-field text-sm" placeholder="z. B. Astrid Günnemann" />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-anthracite-700">Du oder Sie</span>
          <select value={form} onChange={(e) => { setForm(e.target.value); setSaved(false); }} className="input-field text-sm">
            <option value="auto">Automatisch ({customerType === "business" ? "Firma → Sie" : "privat → Du"})</option>
            <option value="du">Du</option>
            <option value="sie">Sie</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-anthracite-700">Anrede</span>
          <select value={sal} onChange={(e) => { setSal(e.target.value); setSaved(false); }} className="input-field text-sm">
            <option value="">Keine Angabe</option>
            <option value="frau">Frau</option>
            <option value="herr">Herr</option>
          </select>
        </label>
      </div>
      <p className="mt-3 rounded-lg bg-sand-50 px-3 py-2 text-sm text-anthracite-600">
        So beginnen die Mails: <strong className="text-anthracite-800">„{greetingLine(preview)},“</strong>
        <span className="text-anthracite-400"> · {usesSie(preview) ? "gesiezt" : "geduzt"}</span>
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed} className="rounded-xl bg-anthracite-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {pending ? "Speichert…" : "Speichern"}
        </button>
        {saved && !changed && <span className="text-sm text-emerald-700">Gespeichert ✓ – gilt ab der nächsten Mail</span>}
      </div>
      <p className="mt-3 text-xs text-anthracite-400">Gilt für alle künftigen Mails, persönliche Nachrichten, das Kundenportal und Angebote. Die Anrede wird nur beim Siezen genutzt, beim Duzen der Vorname. Der Name gilt auch für Vertrag und Rechnungen, die ab jetzt erstellt werden.</p>
    </Card>
  );
}

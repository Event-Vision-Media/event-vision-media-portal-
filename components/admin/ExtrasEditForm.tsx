"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExtras } from "@/app/actions/logistics";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** Admin: Extras einer Buchung nachträglich ändern (z. B. Lieferung zum Audiogästebuch) – bis zur Vertragsunterschrift. */
export function ExtrasEditForm({
  bookingId,
  options,
  selected,
  locked,
}: {
  bookingId: string;
  options: { id: string; name: string; price: number; from: boolean }[];
  selected: string[];
  locked: boolean;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set(selected));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const changed = ids.size !== selected.length || selected.some((id) => !ids.has(id));

  if (locked) return <p className="text-xs text-anthracite-400">Vertrag unterschrieben – Extras sind fix. Änderungen bitte separat abrechnen.</p>;

  function toggle(id: string) {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIds(next);
    setMsg(null);
  }

  function save() {
    start(async () => {
      const r = await updateExtras(bookingId, Array.from(ids));
      if (r.error) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: `Gespeichert – neuer Gesamtpreis ${eur(r.total ?? 0)}. Steht so im Portal und später im Vertrag.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${ids.has(o.id) ? "border-gold-300 bg-gold-50/60" : "border-anthracite-100 bg-white"}`}>
            <input type="checkbox" checked={ids.has(o.id)} onChange={() => toggle(o.id)} className="mt-0.5" />
            <span className="flex-1 text-anthracite-700">{o.name}</span>
            <span className="whitespace-nowrap text-anthracite-500">
              {o.from ? "ab " : ""}
              {eur(o.price)}
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed} className="rounded-lg bg-anthracite-800 px-4 py-2.5 font-medium text-white hover:bg-anthracite-700 disabled:opacity-50">
          {pending ? "Speichert…" : "Extras übernehmen"}
        </button>
        <p className="text-xs text-anthracite-400">Preis, Anfahrt und Abholung werden neu berechnet. Der Kunde bekommt keine automatische Mail.</p>
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

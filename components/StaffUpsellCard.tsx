"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestStaff } from "@/app/actions/upgrade";

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
const START_OPTIONS = Array.from({ length: 27 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/**
 * 360° Video Booth: Betreuung durch Personal hervorgehoben empfehlen. Der Kunde fragt an
 * (Stunden + gewünschter Beginn), du bestätigst und trägst sie im Admin ein.
 */
export function StaffUpsellCard({
  sie,
  price,
  hourPrice,
  includedHours,
  selfService,
  perks,
  requested,
}: {
  sie: boolean;
  price: number;
  hourPrice: number;
  includedHours: number;
  selfService: boolean;
  perks: string[];
  requested: { hours: number; start: string | null } | null;
}) {
  const [hours, setHours] = useState(includedHours);
  const [start, setStart] = useState("");
  const [done, setDone] = useState(Boolean(requested));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const total = price + (hours - includedHours) * hourPrice;

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await requestStaff(hours, start);
      if (r.error) return setError(r.error);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <strong className="block font-serif text-base">Betreuung angefragt ✓</strong>
        {sie
          ? "Wir prüfen kurz, ob an Ihrem Termin Personal frei ist, und melden uns bei Ihnen. Nach unserer Bestätigung steht die Betreuung in Ihrer Buchung."
          : "Wir prüfen kurz, ob an eurem Termin Personal frei ist, und melden uns bei euch. Nach unserer Bestätigung steht die Betreuung in eurer Buchung."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gold-200 bg-gradient-to-br from-white to-gold-50 p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-anthracite-900 text-2xl shadow-glow" aria-hidden="true">
          🎥
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-700">Für die 360° Video Booth empfohlen</p>
          <p className="mt-1 font-serif text-xl font-semibold text-anthracite-800">
            {sie ? "Damit Ihre 360°-Videos richtig gut werden" : "Damit eure 360°-Videos richtig gut werden"}
          </p>
          <p className="mt-1 text-sm text-anthracite-500">
            Betreuung durch unser Personal – <span className="font-semibold text-gold-700">{euro(price)}</span> für {includedHours} Stunden, jede weitere Stunde {euro(hourPrice)}.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-anthracite-700">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-gold-600">✓</span>
            {perk}
          </li>
        ))}
      </ul>

      {selfService && (
        <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-anthracite-600">
          Hinweis: Mit Betreuung liefern wir die Booth auch an und bauen sie auf (Paket 360° Komfort) – das berücksichtigen wir bei unserer Bestätigung.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-anthracite-700">Wie lange?</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="input-field">
            {Array.from({ length: 7 }, (_, i) => includedHours + i).map((h) => (
              <option key={h} value={h}>
                {h} Stunden{h > includedHours ? ` (+${euro((h - includedHours) * hourPrice)})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-anthracite-700">Ab wann? <span className="font-normal text-anthracite-400">(optional)</span></span>
          <select value={start} onChange={(e) => setStart(e.target.value)} className="input-field">
            <option value="">Stimmen wir noch ab</option>
            {START_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t} Uhr
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={send} disabled={pending} className="inline-flex rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-3 text-sm font-medium text-white shadow-glow transition hover:from-gold-500 hover:to-gold-700 disabled:opacity-60">
          {pending ? "Wird gesendet…" : `Betreuung anfragen · ${euro(total)}`}
        </button>
        <span className="text-xs text-anthracite-400">Unverbindlich – wir bestätigen kurz.</span>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

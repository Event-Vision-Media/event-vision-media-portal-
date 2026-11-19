"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveGuestbookGame, type GameActionResult } from "@/app/actions/guestbook-game";
import { GAME, GAME_OCCASIONS, MAX_CUSTOM_TASKS, MAX_NAMES_LENGTH, gameTitle, type GameOccasion } from "@/lib/guestbook-game";

const initial: GameActionResult = {};

const NAMES_LABEL: Record<GameOccasion, { label: string; placeholder: string }> = {
  hochzeit: { label: "Eure Namen", placeholder: "z. B. Anna & Max" },
  geburtstag: { label: "Name des Geburtstagskinds", placeholder: "z. B. Lisa" },
  firma: { label: "Titel", placeholder: "z. B. Weihnachtsfeier der Musterfirma" },
  party: { label: "Titel", placeholder: "z. B. Lisas 30er-Party" },
};

export function GuestbookGameSettings({
  sie,
  occasion: initialOccasion,
  names: initialNames,
  customTasks,
  gameHref,
  printHref,
}: {
  sie: boolean;
  occasion: GameOccasion;
  names: string;
  customTasks: string[];
  gameHref: string;
  printHref: string;
}) {
  const [state, action] = useFormState(saveGuestbookGame, initial);
  const [occasion, setOccasion] = useState<GameOccasion>(initialOccasion);
  const [names, setNames] = useState(initialNames);
  const t = (du: string, s: string) => (sie ? s : du);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={printHref} className="inline-flex items-center justify-center rounded-xl bg-anthracite-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-anthracite-700">
          QR-Code-Aufsteller drucken
        </a>
        <a href={gameHref} target="_blank" rel="noopener" className="inline-flex items-center justify-center rounded-xl border border-anthracite-200 bg-white px-5 py-3 text-sm font-medium text-anthracite-700 transition hover:border-gold-300 hover:bg-gold-50/60">
          Spiel ausprobieren ↗
        </a>
      </div>

      <form action={action} className="space-y-4 rounded-2xl border border-anthracite-100 bg-white p-4 sm:p-5">
        <div>
          <p className="mb-2 text-sm font-medium text-anthracite-700">Anlass</p>
          <div className="flex flex-wrap gap-2">
            {GAME_OCCASIONS.map((o) => (
              <label key={o} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${occasion === o ? "border-anthracite-800 bg-anthracite-800 text-white" : "border-anthracite-200 text-anthracite-600 hover:border-anthracite-400"}`}>
                <input type="radio" name="occasion" value={o} checked={occasion === o} onChange={() => setOccasion(o)} className="sr-only" />
                {GAME[o].label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="gb-names" className="mb-1.5 block text-sm font-medium text-anthracite-700">{NAMES_LABEL[occasion].label}</label>
          <input id="gb-names" name="names" value={names} onChange={(e) => setNames(e.target.value)} maxLength={MAX_NAMES_LENGTH} placeholder={NAMES_LABEL[occasion].placeholder} className="input-field" />
          <p className="mt-1.5 text-xs text-anthracite-400">
            {t("Überschrift für eure Gäste:", "Überschrift für Ihre Gäste:")} <span className="font-medium text-anthracite-600">{gameTitle({ occasion, names })}</span>
          </p>
        </div>

        <div>
          <label htmlFor="gb-tasks" className="mb-1.5 block text-sm font-medium text-anthracite-700">
            {t("Eigene Aufgaben", "Eigene Aufgaben")} <span className="font-normal text-anthracite-400">(optional)</span>
          </label>
          <textarea
            id="gb-tasks"
            name="custom_tasks"
            rows={4}
            defaultValue={customTasks.join("\n")}
            placeholder={"Eine Aufgabe pro Zeile, z. B.\nErzähl, wie Max beim Antrag fast den Ring verloren hätte."}
            className="input-field"
          />
          <p className="mt-1.5 text-xs text-anthracite-400">
            {t(
              `Bis zu ${MAX_CUSTOM_TASKS} Aufgaben, eine pro Zeile. Sie erscheinen in der Wählscheibe als Feld „Spezial“ – zum Beispiel Insider, die nur eure Gäste verstehen.`,
              `Bis zu ${MAX_CUSTOM_TASKS} Aufgaben, eine pro Zeile. Sie erscheinen in der Wählscheibe als Feld „Spezial“ – zum Beispiel Insider, die nur Ihre Gäste verstehen.`
            )}
          </p>
        </div>

        {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">✓ Gespeichert – {t("eure Gäste sehen die Änderung sofort.", "Ihre Gäste sehen die Änderung sofort.")}</p>}
        <SaveButton />
      </form>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gold-600 disabled:opacity-60 sm:w-auto">
      {pending ? "Wird gespeichert …" : "Speichern"}
    </button>
  );
}

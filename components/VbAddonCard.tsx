"use client";

import { useEffect, useState, useTransition } from "react";
import { vbTrack } from "@/components/visionbooth/site/vbTrack";
import { useRouter } from "next/navigation";
import { bookVbAddon } from "@/app/actions/vb-addon";
import { OccasionIcon } from "@/components/visionbooth/site/OccasionIcon";

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
const START_NOW =
  "Bitte sofort einrichten: Ich möchte, dass ihr meine VisionBooth direkt einrichtet – also schon vor Ablauf der 14-tägigen Widerrufsfrist. Mir ist klar, dass mein Widerrufsrecht erlischt, sobald alles vollständig erbracht ist, und dass ich bei einem früheren Widerruf anteilig zahle.";

type Option = { id: string; title: string; price: number; list: number; points: string[]; tag?: string };

/**
 * Kundenportal: VisionBooth als Zusatz zur Buchung („Jeder Gast wird zur Fotobox“).
 * Keine Online-Zahlung – der Preis kommt zum Restbetrag bzw. als Nachzahlung.
 */
export function VbAddonCard({
  sie,
  firma,
  existing,
  dateLabel,
}: {
  sie: boolean;
  firma: boolean;
  existing: { manageUrl: string; free: boolean } | null;
  dateLabel: string;
}) {
  const s = sie;
  const options: Option[] = firma
    ? [{ id: "addon-firma", title: s ? "VisionBooth für Ihr Event" : "VisionBooth für euer Event", price: 149, list: 299, points: [s ? "Ihr Logo im Foto-Rahmen" : "Euer Logo im Foto-Rahmen", s ? "200 KI-Bilder für Ihre Gäste" : "200 KI-Bilder für eure Gäste", "Foto-Missionen für Teams, Foto-Wand optional"] }]
    : [
        { id: "addon-privat-ki", title: "Mit KI-Bildern", price: 59, list: 129, tag: "Beliebt", points: ["Alles aus „Ohne KI“", s ? "100 KI-Verwandlungen für Ihre Gäste" : "100 KI-Verwandlungen für eure Gäste"] },
        { id: "addon-privat", title: "Ohne KI", price: 39, list: 79, points: [s ? "Fotos mit Ihrem Rahmen" : "Fotos mit eurem Rahmen", "Galerie & Spiele, Foto-Wand optional"] },
      ];
  const [choice, setChoice] = useState(options[0].id);
  const [startNow, setStartNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = (du: string, s: string) => (sie ? s : du);
  useEffect(() => {
    if (!existing) vbTrack("vb_upsell_gesehen");
  }, [existing]);
  const picked = options.find((o) => o.id === choice)!;

  if (existing) {
    return (
      <section className="overflow-hidden rounded-3xl bg-[#0d0d10] p-6 text-white shadow-card sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#dcb56a]">VisionBooth</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">{t("Eure VisionBooth ist bereit", "Ihre VisionBooth ist bereit")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {t("Gestaltet Rahmen und Spiele in eurem Bereich – eure Gäste machen am", "Gestalten Sie Rahmen und Spiele in Ihrem Bereich – Ihre Gäste machen am")} {dateLabel} {t("dann mit dem eigenen Handy Fotos.", "dann mit dem eigenen Handy Fotos.")}
        </p>
        <a href={existing.manageUrl} target="_blank" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#f0d595] to-[#c9a04e] px-5 py-2.5 text-sm font-bold text-[#1a1408]">
          <OccasionIcon id="image" className="h-4 w-4" /> {t("Zu eurem Bereich", "Zu Ihrem Bereich")}
        </a>
      </section>
    );
  }

  function book() {
    setError(null);
    if (!firma && !startNow) return setError(t("Bitte bestätige kurz den sofortigen Start (Häkchen unten).", "Bitte bestätigen Sie kurz den sofortigen Start (Häkchen unten)."));
    if (!confirm(`VisionBooth „${picked.title}“ für ${euro(picked.price)} dazubuchen? Der Betrag kommt zu ${t("deinem", "Ihrem")} Restbetrag bzw. als Nachzahlung.`)) return;
    start(async () => {
      const r = await bookVbAddon(choice, startNow);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#0d0d10] p-6 text-white shadow-card sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#c9a04e]/25 blur-3xl" aria-hidden />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#dcb56a]/30 bg-[#dcb56a]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dcb56a]">
          Neu · {t("Nur für Event-Vision-Kunden", "Exklusiv für Event-Vision-Kunden")}
        </p>
        <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug sm:text-[1.7rem]">Jeder Gast wird zur Fotobox</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {t(
            "Zusätzlich zu eurer Buchung: Eure Gäste scannen einen QR-Code und machen mit dem eigenen Handy Fotos mit eurem Rahmen – alle Bilder landen in einer gemeinsamen Galerie. Ideal für die schönen Schnappschüsse an jedem Tisch.",
            "Zusätzlich zu Ihrer Buchung: Ihre Gäste scannen einen QR-Code und fotografieren mit dem eigenen Handy im Rahmen Ihres Events – alle Bilder landen in einer gemeinsamen Galerie."
          )}
        </p>

        <div className={`mt-5 grid gap-3 ${options.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setChoice(o.id)}
              className={`relative rounded-2xl border p-4 text-left transition ${choice === o.id ? "border-[#dcb56a] bg-[#dcb56a]/10" : "border-white/12 bg-white/[0.04] hover:border-white/25"}`}
            >
              {o.tag && <span className="absolute right-3 top-3 rounded-full bg-gradient-to-b from-[#f0d595] to-[#c9a04e] px-2 py-0.5 text-[10px] font-bold text-[#1a1408]">{o.tag}</span>}
              <span className="block text-sm font-semibold text-white">{o.title}</span>
              <span className="mt-1 block">
                <span className="font-serif text-2xl font-semibold text-[#f0d595]">{euro(o.price)}</span>
                <span className="ml-2 text-sm text-white/45 line-through">{euro(o.list)}</span>
              </span>
              <ul className="mt-2 space-y-1 text-[13px] text-white/70">
                {o.points.map((pt) => (
                  <li key={pt} className="flex gap-2"><span className="text-[#dcb56a]">✓</span>{pt}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/55">
          {t("Keine Online-Zahlung nötig: Der Betrag kommt einfach zu deinem Restbetrag bzw. als Nachzahlung – bezahlbar wie gewohnt per Überweisung oder bar.", "Keine Online-Zahlung nötig: Der Betrag kommt zu Ihrem Restbetrag bzw. als Nachzahlung – zahlbar wie gewohnt per Überweisung oder bar.")}{" "}
          <a href="https://visionbooth.de" target="_blank" className="underline underline-offset-2">So funktioniert&apos;s</a>
        </p>

        {!firma && (
          <label className="mt-4 flex items-start gap-3 text-[12.5px] leading-snug text-white/65">
            <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#c9a04e]" />
            <span>{START_NOW} Es gelten die <a href="https://visionbooth.de/vb/agb" target="_blank" className="underline underline-offset-2">AGB</a> und die <a href="https://visionbooth.de/vb/widerruf" target="_blank" className="underline underline-offset-2">Widerrufsbelehrung</a>.</span>
          </label>
        )}
        {error && <p className="mt-3 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm text-red-200">{error}</p>}
        <button
          type="button"
          onClick={book}
          disabled={pending}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#f0d595] to-[#c9a04e] px-6 py-3.5 text-sm font-bold text-[#1a1408] shadow-[0_14px_30px_-12px_rgba(201,160,78,0.8)] disabled:opacity-60 sm:w-auto"
        >
          <OccasionIcon id="camera" className="h-[18px] w-[18px]" />
          {pending ? "Wird eingerichtet …" : `Für ${euro(picked.price)} dazubuchen`}
        </button>
      </div>
    </section>
  );
}

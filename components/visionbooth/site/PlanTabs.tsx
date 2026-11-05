"use client";

import { IconTile } from "./OccasionIcon";
import { useState } from "react";
import Link from "next/link";
import { getPlan, vbTaxNote, type VbPlanId } from "@/components/visionbooth/packages";

// Pakete getrennt nach Privat- und Business-Kunden – jeder sieht nur, was zu ihm passt, mit den passenden Vorteilen.

const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

const GROUPS = {
  privat: {
    label: "Privat",
    intro: "Für Hochzeit, Geburtstag, Kindergeburtstag, Babyparty und jede Party.",
    benefits: [
      { icon: "camera" as const, title: "Auch die Fotofaulen machen mit", text: "Missionen, Punkte und Spiele motivieren selbst die, die sonst nie das Handy zücken – am Ende habt ihr viel mehr Fotos." },
      { icon: "image" as const, title: "Alle Fotos an einem Ort", text: "Kein Hinterherlaufen in WhatsApp-Gruppen: Die Fotos aller Gäste landen automatisch in eurer Galerie." },
      { icon: "heart" as const, title: "Erinnerungen, die bleiben", text: "Fotos im Look eures Festes, KI-Verwandlungen zum Lachen – und alles am nächsten Tag als ZIP." },
    ],
    plans: [
      { id: "party" as VbPlanId, tag: null, points: ["Eigener Foto-Rahmen & Design", "Fotostreifen & Story", "Foto-Missionen & Bestenliste", "Live-Foto-Wand & Galerie", "Link 7 Tage aktiv"] },
      { id: "hochzeit" as VbPlanId, tag: "Beliebt", points: ["Alles aus Party", "150 KI-Verwandlungen", "Hochzeits-Missionen", "Link 14 Tage aktiv", "Galerie 6 Monate"] },
    ],
  },
  business: {
    label: "Business",
    intro: "Für Firmenfeier, Weihnachtsfeier, Messe und Promotion.",
    benefits: [
      { icon: "gift" as const, title: "Leads statt Visitenkarten", text: "Gewinnspiel oder Kontaktformular direkt nach dem Foto – freiwillig und mit Einwilligung der Gäste, am Ende als CSV für euer CRM." },
      { icon: "tag" as const, title: "Eure Marke auf jedem Foto", text: "Rahmen mit Logo und Farben – und jedes geteilte Foto und jede Story trägt euren Namen weiter." },
      { icon: "users" as const, title: "Teams, die zusammenfinden", text: "Missionen wie „Foto mit jemandem aus einer anderen Abteilung“ bringen Kollegen ins Gespräch – mit Live-Bestenliste." },
      { icon: "magnet" as const, title: "Magnet für euren Stand", text: "KI-Verwandlungen und die Live-Foto-Wand ziehen Besucher an – ohne Personal, ohne Aufbau." },
    ],
    plans: [
      { id: "business" as VbPlanId, tag: "Beliebt", points: ["Firmen-Design mit Logo", "300 KI-Verwandlungen", "Team-Missionen", "Gewinnspiel / Kontaktformular", "Kontakte als CSV"] },
      { id: "messe" as VbPlanId, tag: null, points: ["Mehrtägig (bis 5 Tage)", "1.000 KI-Verwandlungen", "Marken-Rahmen", "Gewinnspiel / Kontaktformular", "Live-Foto-Wand für den Stand"] },
    ],
  },
} as const;

export function PlanTabs() {
  const [tab, setTab] = useState<"privat" | "business">("privat");
  const g = GROUPS[tab];
  return (
    <div>
      <div className="mx-auto mt-8 flex w-fit rounded-full bg-white/10 p-1.5" role="tablist">
        {(["privat", "business"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-6 py-2.5 text-[15px] font-bold transition ${tab === k ? "" : "text-white/70 hover:text-white"}`}
            style={tab === k ? { background: "var(--a)", color: "#0d0d0f" } : undefined}
          >
            {GROUPS[k].label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-white/60">{g.intro}</p>

      <div key={tab} className="vb-fade">
        {/* Vorteile */}
        <div className={`mt-8 grid gap-3 ${g.benefits.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          {g.benefits.map((b) => (
            <div key={b.title} className="flex gap-3 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:block sm:p-5">
              <IconTile id={b.icon} />
              <span className="block">
                <span className="block text-[15px] font-bold sm:mt-2 sm:text-[16px]">{b.title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-white/65 sm:text-[14px]">{b.text}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Pakete */}
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {g.plans.map((c) => {
            const p = getPlan(c.id);
            return (
              <div
                key={c.id}
                className={`relative flex flex-col rounded-3xl p-6 ${c.tag ? "ring-2" : "vb-glass"}`}
                style={c.tag ? { background: "linear-gradient(160deg, color-mix(in srgb, var(--a) 22%, #141417), #141417 60%)", ["--tw-ring-color" as string]: "var(--a)" } : undefined}
              >
                {c.tag && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--a)", color: "#0d0d0f" }}>
                    {c.tag}
                  </span>
                )}
                <p className="text-lg font-bold">{p.label}</p>
                <p className="vb-display mt-2 text-4xl font-semibold">{euro(p.price)}</p>
                <ul className="mt-5 flex-1 space-y-2 text-[14px] text-white/75">
                  {c.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span style={{ color: "var(--a)" }}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link href={`/vb/buchen?paket=${c.id}`} className={`mt-6 rounded-full py-3 text-center text-sm font-bold ${c.tag ? "vb-btn" : "border border-white/20 hover:bg-white/10"}`}>
                  {p.label} buchen
                </Link>
              </div>
            );
          })}
        </div>

        {tab === "privat" ? (
          <>
          <p className="mx-auto mt-6 max-w-xl rounded-2xl bg-white/5 px-4 py-3 text-center text-sm text-white/70">
            Eine klassische Fotobox kostet oft mehrere hundert Euro. Die VisionBooth gibt&apos;s ab {euro(getPlan("party").price)} – bei 100 Gästen sind das beim Hochzeitspaket nur{" "}
            {(getPlan("hochzeit").price / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € pro Gast.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-white/55">
            Ihr mietet bei uns schon eine Fotobox oder einen Fotospiegel? Dann gibt&apos;s die VisionBooth als Add-on ab {euro(getPlan("addon-privat").price)} –{" "}
            <a href="https://fotobox-essen.com" className="underline underline-offset-2">fotobox-essen.com</a>
          </p>
          </>
        ) : (
          <p className="mx-auto mt-6 max-w-xl text-center text-sm text-white/55">
            Größeres Event, mehrere Standorte oder eigene KI-Welt mit eurer Marke? Sprecht uns an – wir machen euch ein Angebot. Als Add-on zu unserer Fotobox ab {euro(getPlan("addon-firma").price)}.
          </p>
        )}
        <p className="mt-2 text-center text-xs text-white/40">{vbTaxNote()}</p>
      </div>
    </div>
  );
}

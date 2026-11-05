"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { startVbCheckout, type VbShopResult } from "@/app/actions/vb-shop";
import { drawFrame, FRAME_H, FRAME_W, loadVbFonts, type VbFonts } from "@/components/visionbooth/frame";
import { defaultGames, getOccasion, getPlan, vbTaxNote, VB_OCCASIONS, type VbGames, type VbOccasionId, type VbPlanId } from "@/components/visionbooth/packages";
import { getTemplate, VB_TEMPLATES } from "@/components/visionbooth/templates";
import { VB_CONSENT_START } from "@/components/visionbooth/consent";

const OCC_EMOJI: Record<VbOccasionId, string> = { hochzeit: "💍", kindergeburtstag: "🎈", babyparty: "🍼", geburtstag: "🎂", party: "🎉", firma: "🏢", weihnachtsfeier: "🎄", messe: "🏟️", sonstiges: "✨" };
const OCC_PLAN: Record<VbOccasionId, VbPlanId> = { hochzeit: "hochzeit", kindergeburtstag: "party", babyparty: "party", geburtstag: "party", party: "party", firma: "business", weihnachtsfeier: "business", messe: "messe", sonstiges: "party" };
const OCC_PLACEHOLDER: Record<VbOccasionId, string> = {
  hochzeit: "Anna & Max",
  babyparty: "Baby Muster 2027",
  kindergeburtstag: "Paulas 6. Geburtstag",
  geburtstag: "Lenas 30.",
  party: "Abiball 2026",
  firma: "Muster GmbH · Sommerfest",
  weihnachtsfeier: "Muster GmbH · X-Mas",
  messe: "Muster GmbH",
  sonstiges: "Unser Event",
};
const KID_MOTTOS = VB_TEMPLATES.filter((t) => t.group === "kinder");
const SHOP_PLANS: VbPlanId[] = ["party", "hochzeit", "business", "messe"];
// Je Anlass nur die passenden Pakete (wie auf der Website Privat/Business) – „Sonstiges“ zeigt alle
const BUSINESS_OCC: VbOccasionId[] = ["firma", "weihnachtsfeier", "messe"];
const plansFor = (o: VbOccasionId): VbPlanId[] =>
  o === "sonstiges" ? SHOP_PLANS : BUSINESS_OCC.includes(o) ? ["business", "messe"] : ["party", "hochzeit"];
const STEPS = ["Anlass", "Paket", "Spiele", "Details", "Bezahlen"];
const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;

function PayButton({ price }: { price: number }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="vb-btn w-full rounded-full py-[18px] text-[17px] font-bold disabled:opacity-60">
      {pending ? "Bezahlseite wird geöffnet …" : `Zahlungspflichtig buchen · ${euro(price)}`}
    </button>
  );
}

export function BookingFlow({ initialPlan, cancelled, testMode }: { initialPlan: VbPlanId | null; cancelled: boolean; testMode: boolean }) {
  const [step, setStep] = useState(initialPlan ? 0 : 0);
  const [occasion, setOccasion] = useState<VbOccasionId | null>(null);
  const [plan, setPlan] = useState<VbPlanId | null>(initialPlan);
  const [frameText, setFrameText] = useState("");
  const [date, setDate] = useState("");
  const [days, setDays] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [games, setGames] = useState<VbGames | null>(null);
  const [motto, setMotto] = useState("dino");
  const [allPlans, setAllPlans] = useState(false);
  const [state, action] = useActionState<VbShopResult, FormData>(startVbCheckout, {});
  const top = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const p = plan ? getPlan(plan) : null;
  const firma = Boolean(p?.firma) || occasion === "firma" || occasion === "weihnachtsfeier" || occasion === "messe";
  const today = new Date().toISOString().slice(0, 10);
  const detailsOk = frameText.trim().length > 0 && date >= today && name.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);

  return (
    <div ref={top} className="mx-auto w-full max-w-xl scroll-mt-4 px-5 pb-16">
      {/* Fortschritt */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button key={s} type="button" onClick={() => i < step && go(i)} disabled={i >= step} className="flex-1 text-left">
            <span className="block h-1.5 rounded-full transition-all" style={{ background: i <= step ? "var(--a)" : "rgba(255,255,255,0.15)" }} />
            <span className={`mt-1.5 block text-[11px] font-semibold ${i === step ? "text-white" : "text-white/45"}`}>{s}</span>
          </button>
        ))}
      </div>

      {cancelled && step === 0 && <p className="vb-glass mb-6 rounded-2xl px-4 py-3 text-sm text-white/80">Die Bezahlung wurde abgebrochen – kein Problem, es wurde nichts berechnet. Du kannst einfach neu starten.</p>}

      {step === 0 && (
        <section key="s0" className="vb-in">
          <h1 className="vb-display text-3xl font-semibold">Was feiert ihr?</h1>
          <p className="mt-1 text-white/60">Danach richten wir Design und Missionen passend ein.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {VB_OCCASIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOccasion(o.id);
                  setAllPlans(false);
                  // Paket von der Website behalten, wenn es zum Anlass passt – sonst die Empfehlung
                  if (!initialPlan || !plan || !plansFor(o.id).includes(plan)) setPlan(OCC_PLAN[o.id]);
                  go(1);
                }}
                className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition active:scale-[0.97] ${occasion === o.id ? "ring-2" : "vb-glass"}`}
                style={occasion === o.id ? { background: "color-mix(in srgb, var(--a) 18%, #141417)", ["--tw-ring-color" as string]: "var(--a)" } : undefined}
              >
                <span className="text-3xl">{OCC_EMOJI[o.id]}</span>
                <span className="text-[15px] font-semibold">{o.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && occasion && (
        <section key="s1" className="vb-in">
          <h1 className="vb-display text-3xl font-semibold">Welches Paket?</h1>
          <p className="mt-1 text-white/60">Unsere Empfehlung für {getOccasion(occasion).label}: das Paket „{getPlan(OCC_PLAN[occasion]).label}“.</p>
          <div className="mt-6 space-y-3">
            {(allPlans ? SHOP_PLANS : SHOP_PLANS.filter((id) => plansFor(occasion).includes(id) || id === plan)).map((id) => {
              const pl = getPlan(id);
              const rec = OCC_PLAN[occasion] === id;
              const sel = plan === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.99] ${sel ? "ring-2" : "vb-glass"}`}
                  style={sel ? { background: "color-mix(in srgb, var(--a) 16%, #141417)", ["--tw-ring-color" as string]: "var(--a)" } : undefined}
                >
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${sel ? "" : "border-white/30"}`} style={sel ? { borderColor: "var(--a)" } : undefined}>
                    {sel && <span className="h-3 w-3 rounded-full" style={{ background: "var(--a)" }} />}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[16px] font-bold">
                      {pl.label}
                      {rec && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--a)", color: "#0d0d0f" }}>Empfohlen</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-white/60">{pl.summary}</span>
                  </span>
                  <span className="vb-display text-xl font-semibold">{euro(pl.price)}</span>
                </button>
              );
            })}
          </div>
          {!allPlans && plansFor(occasion).length < SHOP_PLANS.length && (
            <button type="button" onClick={() => setAllPlans(true)} className="mt-3 text-sm text-white/55 underline underline-offset-2 hover:text-white">
              Andere Pakete anzeigen
            </button>
          )}
          <button
            type="button"
            disabled={!plan}
            onClick={() => {
              setGames(defaultGames(plan!, occasion));
              go(2);
            }}
            className="vb-btn mt-6 w-full rounded-full py-4 text-[16px] font-bold disabled:opacity-50"
          >
            Weiter
          </button>
        </section>
      )}

      {step === 2 && occasion && p && games && (
        <section key="sg" className="vb-in">
          <h1 className="vb-display text-3xl font-semibold">Spiele &amp; Extras</h1>
          <p className="mt-1 text-white/60">Was zu {getOccasion(occasion).label} passt, ist schon ausgewählt – alles später im Kundenbereich änderbar.</p>
          <div className="mt-6 space-y-3">
            <GameToggle
              on={games.missions}
              onChange={(v) => setGames({ ...games, missions: v })}
              emoji="🎯"
              title="Foto-Missionen & Bestenliste"
              text="Kleine Foto-Aufgaben mit Punkten – die Besten erscheinen live auf der Foto-Wand."
            />
            {!["kindergeburtstag", "firma", "weihnachtsfeier", "messe"].includes(occasion) && (
            <GameToggle
              on={games.reveal}
              onChange={(v) => setGames({ ...games, reveal: v })}
              emoji="🍼"
              title="Gender-Reveal-Tippspiel"
              text="Gäste tippen Junge oder Mädchen, ihr Foto wird rosa oder blau – und ihr löst live auf."
            />
            )}
            {p.firma && (
              <GameToggle
                on={games.leads}
                onChange={(v) => setGames({ ...games, leads: v })}
                emoji="🎁"
                title="Gewinnspiel / Kontaktformular"
                text="Gäste tragen sich freiwillig ein – ihr bekommt die Kontakte als CSV."
              />
            )}
          </div>
          <button type="button" onClick={() => go(3)} className="vb-btn mt-6 w-full rounded-full py-4 text-[16px] font-bold">
            Weiter
          </button>
        </section>
      )}

      {step === 3 && occasion && p && (
        <section key="s2" className="vb-in">
          <h1 className="vb-display text-3xl font-semibold">Eure Details</h1>
          <p className="mt-1 text-white/60">So sieht euer Foto-Rahmen aus – alles später noch änderbar.</p>
          {occasion === "kindergeburtstag" && (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-semibold text-white/70">Welches Motto?</p>
              <div className="vb-scroll -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {KID_MOTTOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMotto(t.id)}
                    className={`flex flex-none flex-col items-center gap-1 rounded-2xl px-3 py-2.5 transition active:scale-95 ${motto === t.id ? "ring-2" : "vb-glass"}`}
                    style={motto === t.id ? { background: `color-mix(in srgb, ${t.accent} 30%, #141417)`, ["--tw-ring-color" as string]: t.accent } : undefined}
                  >
                    <span className="text-3xl">{t.stickers![0]}</span>
                    <span className="whitespace-nowrap text-[12px] font-semibold">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <FramePreview occasion={occasion} template={occasion === "kindergeburtstag" ? motto : undefined} text={frameText || OCC_PLACEHOLDER[occasion]} date={date} />
          {occasion === "kindergeburtstag" && <p className="mt-3 text-xs text-white/50">🔒 Beim Kindergeburtstag ist die KI-Verwandlung aus – Kinderfotos geben wir nicht an KI-Dienste weiter.</p>}
          <div className="mt-6 space-y-4">
            <Field label="Text im Foto-Rahmen">
              <input value={frameText} onChange={(e) => setFrameText(e.target.value)} maxLength={60} placeholder={`z. B. ${OCC_PLACEHOLDER[occasion]}`} className="vb-input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Datum des Events">
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="vb-input" />
              </Field>
              {p.id === "messe" ? (
                <Field label="Anzahl Tage">
                  <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="vb-input">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? "Tag" : "Tage"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div />
              )}
            </div>
            <Field label="Dein Name">
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} className="vb-input" />
            </Field>
            <Field label="E-Mail – hierhin schicken wir deinen Link">
              <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} className="vb-input" />
            </Field>
            {firma && (
              <Field label="Firma (für die Rechnung, optional)">
                <input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" maxLength={120} className="vb-input" />
              </Field>
            )}
          </div>
          <button type="button" disabled={!detailsOk} onClick={() => go(4)} className="vb-btn mt-6 w-full rounded-full py-4 text-[16px] font-bold disabled:opacity-50">
            Weiter zur Übersicht
          </button>
          {!detailsOk && <p className="mt-2 text-center text-xs text-white/45">Bitte Rahmen-Text, Datum, Name und E-Mail ausfüllen.</p>}
        </section>
      )}

      {step === 4 && occasion && p && (
        <form key="s3" action={action} className="vb-in">
          <h1 className="vb-display text-3xl font-semibold">Fast geschafft!</h1>
          <p className="mt-1 text-white/60">Prüf kurz alles – nach der Zahlung ist eure VisionBooth sofort startklar.</p>
          {[
            ["plan", p.id],
            ["occasion", occasion],
            ["frame_text", frameText],
            ["event_date", date],
            ["event_days", String(days)],
            ["name", name],
            ["email", email],
            ["company", company],
            ["games", JSON.stringify(games ?? defaultGames(p.id, occasion))],
            ["template", occasion === "kindergeburtstag" ? motto : ""],
          ].map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="vb-glass mt-6 divide-y divide-white/10 rounded-3xl">
            <Row label="Paket" value={`${p.label} · ${p.summary}`} onEdit={() => go(1)} />
            <Row label="Anlass" value={`${OCC_EMOJI[occasion]} ${getOccasion(occasion).label}${occasion === "kindergeburtstag" ? ` · Motto ${getTemplate(motto).name}` : ""}`} onEdit={() => go(0)} />
            <Row
              label="Spiele"
              value={[games?.missions && "🎯 Missionen", games?.reveal && "🍼 Tippspiel", games?.leads && p.firma && "🎁 Gewinnspiel"].filter(Boolean).join(" · ") || "keine"}
              onEdit={() => go(2)}
            />
            <Row label="Rahmen" value={frameText} onEdit={() => go(3)} />
            <Row label="Datum" value={`${new Date(date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}${p.id === "messe" ? ` · ${days} ${days === 1 ? "Tag" : "Tage"}` : ""}`} onEdit={() => go(3)} />
            <Row label="Kontakt" value={`${name} · ${email}${company ? ` · ${company}` : ""}`} onEdit={() => go(3)} />
            <Row label="Laufzeit" value={`einmalig, kein Abo · Gäste-Link ab Eventtag ${p.days + (p.id === "messe" ? days - 1 : 0)} Tage aktiv · Fotos ${p.retentionDays} Tage gespeichert, danach automatisch gelöscht`} />
            <div className="flex items-center justify-between px-5 py-4">
              <span className="font-semibold">Gesamt</span>
              <span className="text-right">
                <span className="vb-display block text-2xl font-semibold">{euro(p.price)}</span>
                <span className="block text-[11px] text-white/45">{vbTaxNote()}</span>
              </span>
            </div>
          </div>
          <label className="mt-5 flex items-start gap-3 text-[13px] leading-snug text-white/70">
            <input type="checkbox" name="agb" required className="mt-0.5 h-5 w-5 flex-none accent-[color:var(--a)]" />
            <span>
              Ich akzeptiere die <a href="/vb/agb" target="_blank" className="underline underline-offset-2">AGB</a> und habe die{" "}
              <a href="/vb/widerruf" target="_blank" className="underline underline-offset-2">Widerrufsbelehrung</a> und die{" "}
              <a href="/vb/datenschutz" target="_blank" className="underline underline-offset-2">Datenschutzhinweise</a> gelesen.
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-[13px] leading-snug text-white/70">
            <input type="checkbox" name="start_now" required className="mt-0.5 h-5 w-5 flex-none accent-[color:var(--a)]" />
            <span>{VB_CONSENT_START}</span>
          </label>
          {state.error && <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{state.error}</p>}
          <div className="mt-5">
            <PayButton price={p.price} />
          </div>
          <p className="mt-3 text-center text-xs text-white/45">🔒 Sichere Zahlung über Stripe · Karte, Apple Pay, Google Pay, PayPal u. a.</p>
          {testMode && <p className="mt-2 text-center text-xs font-semibold text-amber-300">Testmodus – es wird kein echtes Geld abgebucht.</p>}
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-white/70">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="w-16 flex-none text-[13px] text-white/50">{label}</span>
      <span className="flex-1 text-[14px] font-medium">{value}</span>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-white/50 underline underline-offset-2">
          ändern
        </button>
      )}
    </div>
  );
}

/** Live-Vorschau des Rahmens mit dem Beispielfoto (fiktive Personen). */
function FramePreview({ occasion, template, text, date }: { occasion: VbOccasionId; template?: string; text: string; date: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const fonts = useRef<VbFonts | undefined>(undefined);
  const [ready, setReady] = useState(0);
  const t = getTemplate(template ?? getOccasion(occasion).template);

  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      img.current = i;
      setReady((n) => n + 1);
    };
    i.src = "/visionbooth/stile/original.webp";
    loadVbFonts(canvas.current).then((f) => {
      fonts.current = f;
      setReady((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img.current) return;
    const sub = date ? new Date(date).toLocaleDateString("de-DE") : "";
    drawFrame(c.getContext("2d")!, img.current, img.current.naturalWidth, img.current.naturalHeight, { template: t.id, text, subtext: sub, accent: t.accent, fonts: fonts.current });
  }, [ready, text, date, t.id, t.accent]);

  return (
    <div className="mt-5 flex items-center gap-4">
      <canvas ref={canvas} width={FRAME_W} height={FRAME_H} className="w-[44%] max-w-[200px] rounded-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]" />
      <p className="flex-1 text-[13px] leading-relaxed text-white/60">
        Vorlage <strong className="text-white">{t.name}</strong>
        <br />
        Farbe, Logo und Vorlage kannst du nach der Buchung frei ändern – {VB_TEMPLATES.length} Designs zur Auswahl.
      </p>
    </div>
  );
}

function GameToggle({ on, onChange, emoji, title, text }: { on: boolean; onChange: (v: boolean) => void; emoji: string; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.99] ${on ? "ring-2" : "vb-glass"}`}
      style={on ? { background: "color-mix(in srgb, var(--a) 14%, #141417)", ["--tw-ring-color" as string]: "var(--a)" } : undefined}
    >
      <span className="text-3xl">{emoji}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-white/60">{text}</span>
      </span>
      <span className="vb-switch" data-on={on} />
    </button>
  );
}

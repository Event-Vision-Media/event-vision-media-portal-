import type { Metadata, Viewport } from "next";
import { OccasionIcon, type LineIconName } from "@/components/visionbooth/site/OccasionIcon";
import { VbGuestbookEditor } from "@/components/visionbooth/customer/VbGuestbookEditor";
import { VbWheelEditor } from "@/components/visionbooth/customer/VbWheelEditor";
import { parseWheel, wheelDefaultFor } from "@/components/visionbooth/wheel";
import { GAME_HOW, WALL_INFO } from "@/components/visionbooth/games-info";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { VbHeroArt } from "@/components/visionbooth/customer/VbHeroArt";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEventByToken, vbClosedReason, vbDeleteAfter, vbGuestUrl, vbProbeKey, VB_BUCKET } from "@/lib/visionbooth";
import { getTemplate } from "@/components/visionbooth/templates";
import { deleteVbPhotoByCustomer, setVbPhotoHiddenByCustomer, updateVbChallenges, updateVbDesign, updateVbGuestbook, updateVbLeads, updateVbReveal, updateVbWheel } from "@/app/actions/vb-customer";
import { VbRevealEditor } from "@/components/visionbooth/customer/VbRevealEditor";
import { parseReveal } from "@/components/visionbooth/reveal";
import { VbLeadsEditor } from "@/components/visionbooth/customer/VbLeadsEditor";
import { parseLeadConfig } from "@/components/visionbooth/leads";
import { listVbLeads } from "@/lib/visionbooth-leads";
import { VbChallengesEditor } from "@/components/visionbooth/customer/VbChallengesEditor";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { VbCustomerDesignForm } from "@/components/visionbooth/customer/VbCustomerDesignForm";
import { VbQrDownload } from "@/components/visionbooth/customer/VbQrDownload";
import { VbPhotoGrid } from "@/components/admin/visionbooth/VbPhotoGrid";
import { CopyField } from "@/components/admin/CopyField";
import { LANDLORD } from "@/lib/contract";
import { relevantGames } from "@/components/visionbooth/packages";
import { VbAppBar } from "@/components/visionbooth/customer/VbAppBar";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

/** Web-App: eigener App-Steckbrief je Event, iPhone-Symbol und Vollbild ohne Browserleiste. */
export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const params = await props.params;
  const event = await loadVbEventByToken(params.token);
  const name = event ? (event.frame_text || event.title).slice(0, 40) : "Meine VisionBooth";
  return {
    title: `${name} – Meine VisionBooth`,
    robots: { index: false, follow: false },
    manifest: `/api/vb/verwalten/${params.token}/manifest`,
    appleWebApp: { capable: true, title: name.length > 14 ? "VisionBooth" : name, statusBarStyle: "black-translucent" },
    icons: { apple: "/visionbooth/apple-touch-icon.png", icon: "/visionbooth/icon-192.png" },
  };
}

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "numeric", month: "long", year: "numeric" });

/** Kundenbereich: VisionBooth gestalten, teilen und Fotos verwalten – Zugang über den geheimen Link. */
export default async function VisionBoothCustomerPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await loadVbEventByToken(params.token);
  if (!event) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-sand-50 px-6 text-center">
        <div>
          <p className="font-serif text-2xl text-anthracite-800">Link nicht gefunden</p>
          <p className="mt-2 text-sm text-anthracite-500">Bitte prüfe den Link aus deiner E-Mail oder melde dich bei uns: {LANDLORD.phone}</p>
        </div>
      </main>
    );
  }

  const supabase = createAdminClient();
  const [{ data: photoRows }, { count: photoTotal }, { count: aiDone }, { data: guests }, { data: greetRows, count: greetTotal }] = await Promise.all([
    supabase.from("vb_photos").select("id, kind, style, file_path, thumb_path, hidden, created_at").eq("event_id", event.id).order("created_at", { ascending: false }).limit(120),
    supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabase.from("vb_ai_jobs").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "fertig"),
    supabase.from("vb_photos").select("guest_key").eq("event_id", event.id).not("guest_key", "is", null).limit(5000),
    supabase.from("vb_photos").select("id, greeting, greeting_name, thumb_path, file_path", { count: "exact" }).eq("event_id", event.id).eq("hidden", false).not("greeting", "is", null).order("created_at", { ascending: false }).limit(6),
  ]);
  const paths = [
    ...(photoRows ?? []).flatMap((p) => (p.thumb_path ? [p.thumb_path, p.file_path] : [p.file_path])),
    ...(greetRows ?? []).map((g) => g.thumb_path || g.file_path),
    ...(event.logo_path ? [event.logo_path] : []),
  ];
  const { data: signed } = paths.length ? await supabase.storage.from(VB_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const greetings = (greetRows ?? []).map((g) => ({ id: g.id, text: g.greeting as string, name: g.greeting_name as string | null, thumb: url.get(g.thumb_path || g.file_path) ?? "" }));
  const photos = (photoRows ?? []).map((p) => ({ id: p.id, kind: p.kind, style: p.style, hidden: p.hidden, createdAt: p.created_at, url: url.get(p.thumb_path || p.file_path) ?? "", full: url.get(p.file_path) ?? "" }));

  const guestUrl = vbGuestUrl(event.slug);
  const guestCount = new Set((guests ?? []).map((g) => g.guest_key)).size;
  const probeKey = vbProbeKey(params.token);
  const qrSvg = await QRCode.toString(guestUrl, { type: "svg", margin: 1 });
  const closed = vbClosedReason(event);
  const t = getTemplate(event.template ?? event.frame_style);
  const deleted = Boolean(event.photos_deleted_at);
  // Spiele: Zähler und Reihenfolge für die Schritte (siehe unten)
  const [tips, leadCount] = await Promise.all([tipCounts(event.id), listVbLeads(event.id).then((l) => l.length)]);
  const fit = relevantGames(event.occasion, event.plan);
  // Vorfreude: Countdown bis zum Event (Berliner Datum)
  const todayBerlin = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const daysToEvent = event.event_date ? Math.round((Date.parse(event.event_date) - Date.parse(todayBerlin)) / 86400000) : null;
  const countdown =
    deleted || daysToEvent === null || daysToEvent < 0
      ? null
      : daysToEvent === 0
        ? "🎉 Heute ist euer Event – viel Spaß!"
        : daysToEvent === 1
          ? "🎉 Morgen ist es so weit!"
          : `🎉 Noch ${daysToEvent} Tage bis zu eurem Event`;
  const status = deleted ? "Abgeschlossen" : closed ? (closed.includes("öffnet") ? "Startet bald" : closed.includes("noch nicht") ? "In Vorbereitung" : "Beendet") : "Live";

  const card = "vbx-card p-6 sm:p-8";

  return (
    <main className="vb vbx pb-24" style={{ ["--a" as string]: VB_GOLD, ["--ink" as string]: "#0d0d0f" }}>
      <div className="vb-aurora" aria-hidden />
      <Swoosh className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[520px] opacity-60" />

      <header className="relative mx-auto max-w-4xl px-5 pb-6" style={{ paddingTop: "max(1.75rem, calc(env(safe-area-inset-top) + 1rem))" }}>
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/55">
          <VbLogo height={26} />
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span>Dein Bereich</span>
        </p>

        <div className="relative mt-5">
          <VbHeroArt className="pointer-events-none absolute -right-4 -top-7 w-[132px] opacity-95 sm:-top-10 sm:w-[220px]" />
          <div className="relative pr-[112px] sm:pr-[210px]">
            <h1 className="vb-display vb-gold-text text-[2.35rem] font-semibold leading-[1.06] sm:text-5xl">{event.frame_text || event.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Live" ? "bg-emerald-400/15 text-emerald-200" : "vbx-chip"}`}>{status}</span>
              {event.event_date && <span>{fmtDate(event.event_date)}</span>}
            </div>
            {countdown && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-semibold text-white">
                <OccasionIcon id="party" className="h-4 w-4 text-[color:var(--vbx-gold)]" />
                {countdown.replace("🎉 ", "")}
              </p>
            )}
          </div>
        </div>
        {event.opens_at && event.closes_at && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vbx-gold)]" aria-hidden />
            Gäste-Link aktiv {fmtDate(event.opens_at)} – {fmtDate(event.closes_at)}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {(
            [
              [photoTotal ?? 0, "Fotos", "image"],
              [guestCount, "Gäste dabei", "users"],
              [aiDone ?? 0, "KI-Bilder", "sparkle"],
            ] as const
          ).map(([v, l, icon]) => (
            <div key={l} className="vbx-card rounded-2xl px-3 py-3.5">
              <div className="flex items-center gap-2">
                <OccasionIcon id={icon} className="h-5 w-5 text-[color:var(--vbx-gold)]" />
                <span className="vb-display text-2xl font-semibold leading-none text-white">{v}</span>
              </div>
              <div className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/55">{l}</div>
            </div>
          ))}
        </div>

        {!deleted && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/vb/${event.slug}?probe=${probeKey}`} target="_blank" className="vb-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold">
              <OccasionIcon id="camera" className="h-[18px] w-[18px]" /> Probefoto machen
            </a>
            <a href={`/vb/verwalten/${params.token}/aufsteller`} target="_blank" className="vbx-chip inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">
              <OccasionIcon id="qr" className="h-[18px] w-[18px] text-[color:var(--vbx-gold)]" /> QR-Aufsteller
            </a>
            {event.wall_enabled && (
              <a href={`/vb/${event.slug}/wall`} target="_blank" className="vbx-chip inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">
                <OccasionIcon id="tv" className="h-[18px] w-[18px] text-[color:var(--vbx-gold)]" /> Foto-Wand
              </a>
            )}
          </div>
        )}
        {!deleted && <VbAppBar token={params.token} />}
      </header>

      <div className="relative mx-auto mt-2 max-w-4xl space-y-5 px-4">
        {!deleted && (
          <nav className={card} aria-label="So wird eure VisionBooth startklar">
            <p className="vbx-eyebrow text-[11px] font-semibold uppercase tracking-[0.26em]">In 3 Schritten startklar</p>
            <p className="vb-display mt-1.5 flex items-center gap-3 text-[1.45rem] font-semibold leading-snug text-white">
              So wird eure VisionBooth perfekt
              <Swoosh className="hidden h-6 w-20 opacity-80 sm:block" small />
            </p>
            <ol className="mt-5 space-y-2.5">
              {(
                [
                  ["#gestalten", "image", "Design & Text", "Vorlage, Namen, Farbe"],
                  ["#spiele", "target", "Spiele auswählen", "Missionen, Glücksrad & Co."],
                  ["#teilen", "link", "Teilen & Loslegen", "QR-Code drucken oder Link teilen"],
                ] as const
              ).map(([href, icon, title, sub], i) => (
                <li key={href}>
                  <a href={href} className="vbx-row group flex items-center gap-4 rounded-2xl px-4 py-3.5">
                    <span className="vbx-tile relative flex h-12 w-12 flex-none items-center justify-center rounded-2xl">
                      <OccasionIcon id={icon} className="h-6 w-6" />
                      <span className="vbx-badge absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold">{i + 1}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-white">{title}</span>
                      <span className="block text-[13px] text-white/55">{sub}</span>
                    </span>
                    <span className="text-xl text-white/35 transition group-hover:translate-x-0.5 group-hover:text-[color:var(--vbx-gold)]">›</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-white/45">Alles lässt sich bis zum Event jederzeit ändern – Änderungen gelten sofort.</p>
          </nav>
        )}

        {/* 1 · Gestalten */}
        <section id="gestalten" className={`${card} scroll-mt-6`}>
          <Step eyebrow="Schritt 1" icon="image" title="Design & Text" hint={`Aktuell: Vorlage „${t.name}“. Änderungen gelten sofort für alle neuen Fotos.`} />
          <div className="mt-6">
            {deleted ? (
              <p className="text-sm text-white/55">Dieses Event ist abgeschlossen.</p>
            ) : (
              <VbCustomerDesignForm
                action={updateVbDesign.bind(null, params.token)}
                initial={{
                  template: t.id,
                  frameText: event.frame_text ?? event.title,
                  subtext: event.frame_subtext ?? "",
                  accent: event.accent_color,
                  logoUrl: event.logo_path ? url.get(event.logo_path) ?? null : null,
                  formats: event.formats ?? ["einzel"],
                  galleryEnabled: event.gallery_enabled,
                  guestUploads: event.guest_uploads !== false,
                  wallEnabled: event.wall_enabled,
                  occasion: event.occasion,
                }}
              />
            )}
          </div>
          {!deleted && (
            <a href={`/vb/${event.slug}?probe=${probeKey}`} target="_blank" className="vbx-row mt-6 flex items-center gap-4 rounded-2xl p-4">
              <span className="vbx-tile flex h-12 w-12 flex-none items-center justify-center rounded-2xl">
                <OccasionIcon id="camera" className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">Probefoto machen</span>
                <span className="block text-sm text-white/55">Erlebt eure VisionBooth genau so wie eure Gäste – am besten auf dem Handy. Wird nicht gespeichert.</span>
              </span>
              <span className="text-xl text-white/35">›</span>
            </a>
          )}
        </section>

        {/* Spiele: passend zum Anlass oben, der Rest eingeklappt */}
        {(() => {
          const missions = (n: number) => (
            <section key="m" className={card}>
              <Step eyebrow={n > 0 ? "Schritt 2 · Spiele" : undefined} icon="target" title="Foto-Missionen & Bestenliste" hint="Das Highlight für eure Gäste: Foto-Aufgaben mit Punkten. Jeder sieht seine Punkte und die Bestenliste direkt auf dem Handy – und, wenn ihr möchtet, groß auf der Foto-Wand." how={GAME_HOW.missions} />
              <div className="mt-6">
                {deleted ? (
                  <p className="text-sm text-white/55">Dieses Event ist abgeschlossen.</p>
                ) : (
                  <VbChallengesEditor action={updateVbChallenges.bind(null, params.token)} initial={parseChallenges(event.challenges)} galleryEnabled={event.gallery_enabled} />
                )}
              </div>
            </section>
          );
          const wheel = (n: number) => (
            <section key="w" className={card}>
              <Step eyebrow={n > 0 ? "Schritt 2 · Spiele" : undefined} icon="wheel" title="Foto-Glücksrad" hint="Gäste drehen am Rad und bekommen eine lustige Foto-Aufgabe – spontan und ohne Punkte." how={GAME_HOW.wheel} />
              <div className="mt-6">
                <VbWheelEditor action={updateVbWheel.bind(null, params.token)} initial={parseWheel(event.wheel)} defaults={wheelDefaultFor(event.occasion)} />
              </div>
            </section>
          );
          const guestbook = (n: number) => (
            <section key="g" className={card}>
              <Step eyebrow={n > 0 ? "Schritt 2 · Spiele" : undefined} icon="heart" title="Gästebuch-Grüße" hint="Gäste schreiben zum Foto einen kurzen Gruß – am Ende habt ihr ein Gästebuch mit Fotos zum Drucken." how={GAME_HOW.guestbook} />
              <div className="mt-6">
                <VbGuestbookEditor action={updateVbGuestbook.bind(null, params.token)} enabled={Boolean(event.guestbook)} galleryEnabled={event.gallery_enabled} greetings={greetings} total={greetTotal ?? 0} bookUrl={`/vb/verwalten/${params.token}/gaestebuch`} />
              </div>
            </section>
          );
          const reveal = (n: number) => (
            <section key="r" className={card}>
              <Step eyebrow={n > 0 ? "Schritt 2 · Spiele" : undefined} icon="babyparty" title="Tippspiel / Gender Reveal" hint="Junge oder Mädchen? Gäste tippen auf dem Handy, den Stand seht ihr hier und auf der Foto-Wand – ihr löst live auf." how={GAME_HOW.reveal} />
              <div className="mt-6">
                <VbRevealEditor action={updateVbReveal.bind(null, params.token)} initial={parseReveal(event.reveal)} counts={tips} />
              </div>
            </section>
          );
          const leads = (n: number) => (
            <section key="l" className={card}>
              <Step eyebrow={n > 0 ? "Schritt 2 · Spiele" : undefined} icon="gift" title="Kontakte & Gewinnspiel" hint="Für Firmen-Events: Gäste tragen sich freiwillig ein – ihr bekommt die Kontakte als CSV." how={GAME_HOW.leads} />
              <div className="mt-6">
                <VbLeadsEditor action={updateVbLeads.bind(null, params.token)} initial={parseLeadConfig(event.leads)} count={leadCount} csvUrl={`/api/vb/verwalten/${params.token}/kontakte`} />
              </div>
            </section>
          );
          // oben: passt zum Anlass oder ist schon eingeschaltet
          const items = [
            { key: "missions", top: fit.missions || parseChallenges(event.challenges).length > 0, render: missions, done: false },
            { key: "wheel", top: Boolean(fit.wheel) || parseWheel(event.wheel).enabled, render: wheel, done: deleted },
            { key: "guestbook", top: Boolean(fit.guestbook) || Boolean(event.guestbook) || (greetTotal ?? 0) > 0, render: guestbook, done: false },
            { key: "leads", top: fit.leads || parseLeadConfig(event.leads).enabled, render: leads, done: deleted },
            { key: "reveal", top: fit.reveal || parseReveal(event.reveal).enabled, render: reveal, done: deleted },
          ];
          const top = items.filter((i) => i.top && !i.done);
          const more = items.filter((i) => !i.top && !i.done);
          return (
            <>
              {top.map((i, n) => <div key={i.key} id={n === 0 ? "spiele" : undefined} className="scroll-mt-6">{i.render(1)}</div>)}
              {more.length > 0 && (
                <details className={`group ${card}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="flex items-center gap-4">
                      <span className="vbx-tile flex h-12 w-12 flex-none items-center justify-center rounded-2xl">
                        <OccasionIcon id="sparkle" className="h-6 w-6" />
                      </span>
                      <span>
                        <span className="vb-display block text-xl font-semibold text-white">Weitere Spiele &amp; Extras</span>
                        <span className="mt-0.5 block text-sm text-white/55">
                          {more.map((i) => ({ missions: "Missionen", wheel: "Glücksrad", guestbook: "Gästebuch", reveal: "Tippspiel", leads: "Gewinnspiel" })[i.key]).join(" · ")}
                        </span>
                      </span>
                    </span>
                    <span className="text-2xl text-white/40 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-white/45">Passt nicht zu jedem Anlass, lässt sich aber jederzeit dazuschalten.</p>
                  <div className="mt-5 space-y-5">{more.map((i) => i.render(0))}</div>
                </details>
              )}
            </>
          );
        })()}

        {/* Teilen & Loslegen (nach Gestalten und Spielen) */}
        <section id="teilen" className={`${card} scroll-mt-6`}>
          <Step eyebrow="Schritt 3" icon="link" title="Teilen & Loslegen" hint="Wenn Design und Spiele passen: Aufsteller ausdrucken oder den Link vorab an eure Gäste schicken." />
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_190px]">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Gäste-Link</p>
                <CopyField value={guestUrl} />
              </div>
              {event.gallery_enabled && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Galerie-Link (für nach dem Event)</p>
                  <CopyField value={`${guestUrl}/galerie`} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={`/vb/verwalten/${params.token}/aufsteller`} target="_blank" className="vb-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold">
                  <OccasionIcon id="qr" className="h-[18px] w-[18px]" /> QR-Aufsteller drucken
                </a>
                <VbQrDownload svg={qrSvg} name={`visionbooth-${event.slug}`} />
                {event.wall_enabled && (
                  <a href={`/vb/${event.slug}/wall`} target="_blank" className="vbx-chip inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium">
                    <OccasionIcon id="tv" className="h-4 w-4 text-[color:var(--vbx-gold)]" /> Foto-Wand öffnen
                  </a>
                )}
              </div>
            </div>
            <div className="vbx-keep-light mx-auto w-44 rounded-2xl p-3 shadow-[0_18px_40px_-20px_rgba(220,181,106,0.6)]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          {event.wall_enabled && (
            <details className="group vbx-row mt-6 rounded-2xl p-4 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-white">
                <OccasionIcon id="tv" className="h-5 w-5 text-[color:var(--vbx-gold)]" />
                Foto-Wand auf dem Fernseher zeigen
                <span className="ml-auto text-lg text-white/40 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-white/70">{WALL_INFO.intro}</p>
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Link zur Foto-Wand</p>
                <CopyField value={`${guestUrl}/wall`} />
              </div>
              <ol className="mt-4 space-y-2.5 text-white/70">
                {WALL_INFO.ways.map((w, i) => (
                  <li key={w.title} className="flex gap-3">
                    <span className="vbx-badge flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold">{i + 1}</span>
                    <span>
                      <strong className="text-white">{w.title}:</strong> {w.text}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-white/45">Neue Fotos erscheinen automatisch – niemand muss etwas bedienen. Tipp: Vorher einmal kurz testen, ob der Fernseher den Link öffnet.</p>
            </details>
          )}
        </section>

        {/* Fotos */}
        <section className={card}>
          <Step eyebrow="Während & nach dem Event" icon="camera" title="Eure Fotos" hint="Hier seht ihr alle Fotos, die Gäste für die Galerie freigegeben haben." />
          {event.ai_enabled && event.ai_limit > 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
              <OccasionIcon id="sparkle" className="h-5 w-5 flex-none text-[color:var(--vbx-gold)]" />
              <span className="flex-1 text-white/75">KI-Bilder</span>
              <span className="font-semibold text-white">{aiDone ?? 0} von {event.ai_limit}</span>
            </div>
          )}
          {!deleted && (
            <p className="mt-4 rounded-2xl border border-[rgba(220,181,106,0.25)] bg-[rgba(220,181,106,0.08)] px-4 py-3 text-sm leading-relaxed text-white/80">
              Aus Datenschutzgründen werden alle Fotos am <strong className="text-white">{fmtDate(vbDeleteAfter(event))}</strong> automatisch gelöscht. Ladet sie vorher in der{" "}
              <a href={`/vb/${event.slug}/galerie`} target="_blank" className="font-semibold text-[color:var(--vbx-gold)] underline underline-offset-2">Galerie mit „Alle herunterladen (ZIP)“</a> herunter.
            </p>
          )}
          <div className="mt-5">
            {deleted ? (
              <p className="text-sm text-white/55">Die Fotos wurden am {fmtDate(event.photos_deleted_at!)} gelöscht.</p>
            ) : (
              <VbPhotoGrid eventId={event.id} photos={photos} toggle={setVbPhotoHiddenByCustomer.bind(null, params.token)} remove={deleteVbPhotoByCustomer.bind(null, params.token)} />
            )}
          </div>
          <p className="mt-3 text-xs text-white/40">Ausgeblendete Fotos verschwinden von Galerie und Foto-Wand (spätestens nach einer Minute) und lassen sich wieder einblenden. Der Papierkorb löscht ein Foto endgültig.</p>
        </section>

        <p className="px-2 pt-2 text-center text-xs leading-relaxed text-white/40">
          Fragen? {LANDLORD.phone} (auch WhatsApp) · {LANDLORD.email}
          <br />
          Bitte gebt diesen Link nicht weiter – damit lässt sich eure VisionBooth bearbeiten.
        </p>
      </div>
    </main>
  );
}

const VB_GOLD = "#c9a04e";

function Step({ eyebrow, title, hint, how, icon = "sonstiges" }: { eyebrow?: string; title: string; hint: string; how?: { title: string; steps: string[] }; icon?: LineIconName }) {
  return (
    <div className="flex items-start gap-4">
      <span className="vbx-tile flex h-12 w-12 flex-none items-center justify-center rounded-2xl">
        <OccasionIcon id={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="vbx-eyebrow text-[11px] font-semibold uppercase tracking-[0.24em]">{eyebrow}</p>}
        <h2 className="vb-display text-[1.4rem] font-semibold leading-snug text-white">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{hint}</p>
        {how && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-[color:var(--vbx-gold)] underline underline-offset-2">So funktioniert&apos;s</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-white/70">
              {how.steps.map((st) => (
                <li key={st}>{st}</li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}

/** Feiner goldener Lichtschwung (Deko). */
function Swoosh({ className = "", small = false }: { className?: string; small?: boolean }) {
  return small ? (
    <svg viewBox="0 0 80 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vbs-s" x1="0" x2="1">
          <stop offset="0" stopColor="#dcb56a" stopOpacity="0" />
          <stop offset=".6" stopColor="#f0d595" />
          <stop offset="1" stopColor="#dcb56a" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path d="M2 20C24 20 44 6 78 4" stroke="url(#vbs-s)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M14 22C34 21 52 12 76 10" stroke="url(#vbs-s)" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".6" />
    </svg>
  ) : (
    <svg viewBox="0 0 520 420" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vbs-l" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#dcb56a" stopOpacity="0" />
          <stop offset=".55" stopColor="#e8c47a" stopOpacity=".55" />
          <stop offset="1" stopColor="#dcb56a" stopOpacity="0" />
        </linearGradient>
        <filter id="vbs-blur"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <path d="M40 400C180 330 300 210 500 20" stroke="url(#vbs-l)" strokeWidth="2" fill="none" filter="url(#vbs-blur)" />
      <path d="M110 410C240 340 340 240 520 80" stroke="url(#vbs-l)" strokeWidth="1.2" fill="none" opacity=".6" />
    </svg>
  );
}

async function tipCounts(eventId: string) {
  const { data } = await createAdminClient().from("vb_tips").select("choice").eq("event_id", eventId).limit(10000);
  return { a: (data ?? []).filter((t) => t.choice === "a").length, b: (data ?? []).filter((t) => t.choice === "b").length };
}

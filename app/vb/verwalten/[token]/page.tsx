import type { Metadata, Viewport } from "next";
import { OccasionIcon, type LineIconName } from "@/components/visionbooth/site/OccasionIcon";
import { VbGuestbookEditor } from "@/components/visionbooth/customer/VbGuestbookEditor";
import { VbWheelEditor } from "@/components/visionbooth/customer/VbWheelEditor";
import { parseWheel, wheelDefaultFor } from "@/components/visionbooth/wheel";
import { GAME_HOW, WALL_INFO } from "@/components/visionbooth/games-info";
import { VbLogo } from "@/components/visionbooth/VbLogo";
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
import { onAccent, uiAccent } from "@/components/visionbooth/frame";

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
  // Anzahl der Spiele, die oben (nummeriert) stehen – gleiche Regeln wie unten bei „items“
  const gameCount = [
    fit.missions || parseChallenges(event.challenges).length > 0,
    !deleted && (Boolean(fit.wheel) || parseWheel(event.wheel).enabled),
    Boolean(fit.guestbook) || Boolean(event.guestbook) || (greetTotal ?? 0) > 0,
    !deleted && (fit.leads || parseLeadConfig(event.leads).enabled),
    !deleted && (fit.reveal || parseReveal(event.reveal).enabled),
  ].filter(Boolean).length;
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

  return (
    <main className="min-h-[100dvh] bg-sand-50 pb-20">
      <header className="vb relative overflow-hidden" style={{ ["--a" as string]: uiAccent(event.accent_color), ["--ink" as string]: onAccent(uiAccent(event.accent_color)), minHeight: 0 }}>
        <div className="vb-aurora" style={{ position: "absolute" }} aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-8" style={{ paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))" }}>
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60">
            <VbLogo height={26} />
            <span>· Dein Bereich</span>
          </p>
          <h1 className="vb-display vb-gold-text mt-3 text-4xl font-semibold leading-tight">{event.frame_text || event.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Live" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/80"}`}>{status}</span>
            {event.event_date && <span>Event am {fmtDate(event.event_date)}</span>}
            {countdown && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">{countdown}</span>}
            {event.opens_at && event.closes_at && <span>· Gäste-Link aktiv {fmtDate(event.opens_at)} – {fmtDate(event.closes_at)}</span>}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {[
              [photoTotal ?? 0, "Fotos"],
              [guestCount, "Gäste dabei"],
              [aiDone ?? 0, "KI-Bilder"],
            ].map(([v, l]) => (
              <div key={l as string} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur">
                <div className="vb-display text-2xl font-semibold text-white">{v}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/55">{l}</div>
              </div>
            ))}
          </div>
          {!deleted && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/vb/${event.slug}?probe=${probeKey}`} target="_blank" className="vb-btn rounded-full px-4 py-2 text-sm font-bold">
                Probefoto machen
              </a>
              <a href={`/vb/verwalten/${params.token}/aufsteller`} target="_blank" className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10">
                QR-Aufsteller
              </a>
              {event.wall_enabled && (
                <a href={`/vb/${event.slug}/wall`} target="_blank" className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10">
                  Foto-Wand
                </a>
              )}
            </div>
          )}
          {!deleted && <VbAppBar token={params.token} />}
        </div>
      </header>

      <div className="mx-auto -mt-4 max-w-4xl space-y-6 px-4">
        {!deleted && (
          <nav className="rounded-[28px] border border-gold-100 bg-gradient-to-br from-white via-white to-gold-50/60 p-5 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-6" aria-label="So wird eure VisionBooth startklar">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-700">In 3 Schritten startklar</p>
            <p className="mt-1 font-serif text-xl font-semibold text-anthracite-800">So wird eure VisionBooth perfekt</p>
            <ol className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {(
                [
                  ["#gestalten", "image", "Design & Text", "Vorlage, Namen, Farbe"],
                  ["#spiele", "target", "Spiele auswählen", "Missionen, Glücksrad & Co."],
                  ["#teilen", "phone", "QR-Aufsteller", "drucken oder Link teilen"],
                ] as const
              ).map(([href, icon, title, sub], i) => (
                <li key={href}>
                  <a href={href} className="group flex items-center gap-3 rounded-2xl border border-anthracite-100 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-[0_10px_24px_-16px_rgba(168,119,49,0.8)]">
                    <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-anthracite-900 text-gold-300">
                      <OccasionIcon id={icon} className="h-5 w-5" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white">{i + 1}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-anthracite-800">{title}</span>
                      <span className="block text-xs text-anthracite-500">{sub}</span>
                    </span>
                    <span className="text-anthracite-300 transition group-hover:text-gold-600">›</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-anthracite-500">Alles lässt sich bis zum Event jederzeit ändern – Änderungen gelten sofort.</p>
          </nav>
        )}
        {/* 1 · Gestalten */}
        <section id="gestalten" className="scroll-mt-6 rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
          <Step n={1} icon="image" title="Gestalten" hint={`Aktuell: Vorlage „${t.name}“. Änderungen gelten sofort für alle neuen Fotos.`} />
          <div className="mt-5">
            {deleted ? (
              <p className="text-sm text-anthracite-500">Dieses Event ist abgeschlossen.</p>
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
            <a
              href={`/vb/${event.slug}?probe=${probeKey}`}
              target="_blank"
              className="mt-6 flex items-center gap-4 rounded-2xl border border-gold-200 bg-gradient-to-br from-white to-gold-50 p-4 transition hover:border-gold-400"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-anthracite-900 text-xl" aria-hidden>
                📸
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-anthracite-800">Probefoto machen</span>
                <span className="block text-sm text-anthracite-500">Erlebt eure VisionBooth genau so wie eure Gäste – am besten auf dem Handy. Wird nicht gespeichert.</span>
              </span>
              <span className="text-xl text-anthracite-400">›</span>
            </a>
          )}
        </section>

        {/* Spiele: passend zum Anlass oben, der Rest eingeklappt */}
        {(() => {
          const missions = (n: number) => (
            <section key="m" className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
              <Step n={n} icon="target" title="Foto-Missionen & Bestenliste" hint="Das Highlight für eure Gäste: Foto-Aufgaben mit Punkten. Jeder sieht seine Punkte und die Bestenliste direkt auf dem Handy – und, wenn ihr möchtet, groß auf der Foto-Wand." how={GAME_HOW.missions} />
              <div className="mt-5">
                {deleted ? (
                  <p className="text-sm text-anthracite-500">Dieses Event ist abgeschlossen.</p>
                ) : (
                  <VbChallengesEditor action={updateVbChallenges.bind(null, params.token)} initial={parseChallenges(event.challenges)} galleryEnabled={event.gallery_enabled} />
                )}
              </div>
            </section>
          );
          const wheel = (n: number) => (
            <section key="w" className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
              <Step n={n} icon="wheel" title="Foto-Glücksrad" hint="Gäste drehen am Rad und bekommen eine lustige Foto-Aufgabe – spontan und ohne Punkte." how={GAME_HOW.wheel} />
              <div className="mt-5">
                <VbWheelEditor action={updateVbWheel.bind(null, params.token)} initial={parseWheel(event.wheel)} defaults={wheelDefaultFor(event.occasion)} />
              </div>
            </section>
          );
          const guestbook = (n: number) => (
            <section key="g" className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
              <Step n={n} icon="heart" title="Gästebuch-Grüße" hint="Gäste schreiben zum Foto einen kurzen Gruß – am Ende habt ihr ein Gästebuch mit Fotos zum Drucken." how={GAME_HOW.guestbook} />
              <div className="mt-5">
                <VbGuestbookEditor action={updateVbGuestbook.bind(null, params.token)} enabled={Boolean(event.guestbook)} galleryEnabled={event.gallery_enabled} greetings={greetings} total={greetTotal ?? 0} bookUrl={`/vb/verwalten/${params.token}/gaestebuch`} />
              </div>
            </section>
          );
          const reveal = (n: number) => (
            <section key="r" className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
              <Step n={n} icon="babyparty" title="Tippspiel / Gender Reveal" hint="Junge oder Mädchen? Gäste tippen auf dem Handy, den Stand seht ihr hier und auf der Foto-Wand – ihr löst live auf." how={GAME_HOW.reveal} />
              <div className="mt-5">
                <VbRevealEditor action={updateVbReveal.bind(null, params.token)} initial={parseReveal(event.reveal)} counts={tips} />
              </div>
            </section>
          );
          const leads = (n: number) => (
            <section key="l" className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
              <Step n={n} icon="gift" title="Kontakte & Gewinnspiel" hint="Für Firmen-Events: Gäste tragen sich freiwillig ein – ihr bekommt die Kontakte als CSV." how={GAME_HOW.leads} />
              <div className="mt-5">
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
              {top.map((i, n) => <div key={i.key} id={n === 0 ? "spiele" : undefined} className="scroll-mt-6">{i.render(2 + n)}</div>)}
              {more.length > 0 && (
                <details className="group rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                      <span className="block font-serif text-xl font-semibold text-anthracite-800">Weitere Spiele &amp; Extras</span>
                      <span className="mt-0.5 block text-sm text-anthracite-500">
                        {more.map((i) => ({ missions: "Missionen", wheel: "Glücksrad", guestbook: "Gästebuch", reveal: "Tippspiel", leads: "Gewinnspiel" })[i.key]).join(" · ")} – passt nicht zu jedem Anlass, aber jederzeit möglich
                      </span>
                    </span>
                    <span className="text-2xl text-anthracite-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-5 space-y-6">{more.map((i) => i.render(0))}</div>
                </details>
              )}
            </>
          );
        })()}

        {/* 3 · Teilen & aufstellen (nach Gestalten und Spielen) */}
        <section id="teilen" className="relative scroll-mt-6 rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
          <Step n={2 + gameCount} icon="phone" title="Teilen & aufstellen" hint="Wenn Design und Spiele passen: Aufsteller ausdrucken oder den Link vorab an eure Gäste schicken." />
          <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_180px]">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-anthracite-400">Gäste-Link</p>
                <CopyField value={guestUrl} />
              </div>
              {event.gallery_enabled && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-anthracite-400">Galerie-Link (für nach dem Event)</p>
                  <CopyField value={`${guestUrl}/galerie`} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={`/vb/verwalten/${params.token}/aufsteller`} target="_blank" className="rounded-full bg-anthracite-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-anthracite-700">
                  QR-Aufsteller drucken (A5)
                </a>
                <VbQrDownload svg={qrSvg} name={`visionbooth-${event.slug}`} />
                {event.wall_enabled && (
                  <a href={`/vb/${event.slug}/wall`} target="_blank" className="rounded-full border border-anthracite-200 bg-white px-4 py-2.5 text-sm font-medium text-anthracite-800 hover:border-gold-400">
                    Foto-Wand öffnen
                  </a>
                )}
                <a href={`/vb/${event.slug}?probe=${probeKey}`} target="_blank" className="rounded-full border border-anthracite-200 bg-white px-4 py-2.5 text-sm font-medium text-anthracite-800 hover:border-gold-400">
                  Selbst ausprobieren
                </a>
              </div>
            </div>
            <div className="mx-auto w-40 rounded-2xl border border-anthracite-100 bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          {event.wall_enabled && (
            <details className="group mt-5 rounded-2xl border border-anthracite-100 bg-sand-50/60 p-4 text-sm text-anthracite-600" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-anthracite-800">
                📺 Foto-Wand auf dem Fernseher zeigen – so geht&apos;s
                <span className="ml-auto text-xs font-normal text-anthracite-400 group-open:hidden">anzeigen</span>
              </summary>
              <p className="mt-2 leading-relaxed">{WALL_INFO.intro}</p>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-anthracite-400">Link zur Foto-Wand</p>
                <CopyField value={`${guestUrl}/wall`} />
              </div>
              <ol className="mt-3 space-y-2">
                {WALL_INFO.ways.map((w, i) => (
                  <li key={w.title} className="flex gap-2">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-anthracite-900 text-[11px] font-bold text-white">{i + 1}</span>
                    <span>
                      <strong className="text-anthracite-800">{w.title}:</strong> {w.text}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-anthracite-500">Neue Fotos erscheinen automatisch – niemand muss etwas bedienen. Tipp: Vorher einmal kurz testen, ob der Fernseher den Link öffnet.</p>
            </details>
          )}
        </section>

        {/* 4 · Fotos */}
        <section className="rounded-[28px] border border-anthracite-100/70 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(31,34,39,0.35)] sm:p-8">
          <Step n={3 + gameCount} icon="camera" title="Eure Fotos" hint="Hier seht ihr alle Fotos, die Gäste für die Galerie freigegeben haben." />
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Kpi label="Fotos" value={photoTotal ?? 0} />
            <Kpi label="Gäste" value={guestCount} />
            <Kpi label={event.ai_enabled ? `KI-Bilder (von ${event.ai_limit})` : "KI-Bilder"} value={aiDone ?? 0} />
          </div>
          {!deleted && (
            <p className="mt-4 rounded-2xl bg-gold-50 px-4 py-3 text-sm text-gold-800">
              Aus Datenschutzgründen werden alle Fotos am <strong>{fmtDate(vbDeleteAfter(event))}</strong> automatisch gelöscht. Ladet sie vorher in der{" "}
              <a href={`/vb/${event.slug}/galerie`} target="_blank" className="font-semibold underline">Galerie mit „Alle herunterladen (ZIP)“</a> herunter.
            </p>
          )}
          <div className="mt-5">
            {deleted ? (
              <p className="text-sm text-anthracite-500">Die Fotos wurden am {fmtDate(event.photos_deleted_at!)} gelöscht.</p>
            ) : (
              <VbPhotoGrid eventId={event.id} photos={photos} toggle={setVbPhotoHiddenByCustomer.bind(null, params.token)} remove={deleteVbPhotoByCustomer.bind(null, params.token)} />
            )}
          </div>
          <p className="mt-3 text-xs text-anthracite-400">Ausgeblendete Fotos verschwinden von Galerie und Foto-Wand (spätestens nach einer Minute) und lassen sich wieder einblenden. 🗑 löscht ein Foto endgültig.</p>
        </section>

        <p className="px-2 text-center text-xs text-anthracite-400">
          Fragen? {LANDLORD.phone} (auch WhatsApp) · {LANDLORD.email} · Bitte gebt diesen Link nicht weiter – damit lässt sich eure VisionBooth bearbeiten.
        </p>
      </div>
    </main>
  );
}

function Step({ n, title, hint, how, icon = "sonstiges" }: { n: number; title: string; hint: string; how?: { title: string; steps: string[] }; icon?: LineIconName }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-gold-200 bg-gradient-to-b from-gold-50 to-white text-gold-700 shadow-[0_6px_18px_-10px_rgba(168,119,49,0.7)]">
        <OccasionIcon id={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        {n > 0 && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-700">Schritt {n}</p>}
        <h2 className="font-serif text-xl font-semibold text-anthracite-800">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-anthracite-500">{hint}</p>
        {how && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-gold-700 underline underline-offset-2">So funktioniert&apos;s</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-anthracite-600">
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gold-100 bg-gradient-to-b from-gold-50/70 to-white px-3 py-4">
      <div className="font-serif text-2xl font-semibold text-gold-800">{value}</div>
      <div className="mt-0.5 text-xs text-anthracite-500">{label}</div>
    </div>
  );
}

async function tipCounts(eventId: string) {
  const { data } = await createAdminClient().from("vb_tips").select("choice").eq("event_id", eventId).limit(10000);
  return { a: (data ?? []).filter((t) => t.choice === "a").length, b: (data ?? []).filter((t) => t.choice === "b").length };
}

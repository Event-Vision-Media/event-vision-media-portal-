import type { Metadata, Viewport } from "next";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEventByToken, vbClosedReason, vbDeleteAfter, vbGuestUrl, VB_BUCKET } from "@/lib/visionbooth";
import { getTemplate } from "@/components/visionbooth/templates";
import { deleteVbPhotoByCustomer, setVbPhotoHiddenByCustomer, updateVbChallenges, updateVbDesign, updateVbLeads, updateVbReveal } from "@/app/actions/vb-customer";
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
  const [{ data: photoRows }, { count: photoTotal }, { count: aiDone }, { data: guests }] = await Promise.all([
    supabase.from("vb_photos").select("id, kind, style, file_path, thumb_path, hidden, created_at").eq("event_id", event.id).order("created_at", { ascending: false }).limit(120),
    supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabase.from("vb_ai_jobs").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "fertig"),
    supabase.from("vb_photos").select("guest_key").eq("event_id", event.id).not("guest_key", "is", null).limit(5000),
  ]);
  const paths = [...(photoRows ?? []).flatMap((p) => (p.thumb_path ? [p.thumb_path, p.file_path] : [p.file_path])), ...(event.logo_path ? [event.logo_path] : [])];
  const { data: signed } = paths.length ? await supabase.storage.from(VB_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const photos = (photoRows ?? []).map((p) => ({ id: p.id, kind: p.kind, style: p.style, hidden: p.hidden, createdAt: p.created_at, url: url.get(p.thumb_path || p.file_path) ?? "", full: url.get(p.file_path) ?? "" }));

  const guestUrl = vbGuestUrl(event.slug);
  const qrSvg = await QRCode.toString(guestUrl, { type: "svg", margin: 1 });
  const closed = vbClosedReason(event);
  const t = getTemplate(event.template ?? event.frame_style);
  const deleted = Boolean(event.photos_deleted_at);
  // Spiele: Zähler und Reihenfolge für die Schritte (siehe unten)
  const [tips, leadCount] = await Promise.all([tipCounts(event.id), listVbLeads(event.id).then((l) => l.length)]);
  const fit = relevantGames(event.occasion, event.plan);
  const photoStep = [
    fit.missions || parseChallenges(event.challenges).length > 0,
    !deleted && (fit.leads || parseLeadConfig(event.leads).enabled),
    !deleted && (fit.reveal || parseReveal(event.reveal).enabled),
  ].filter(Boolean).length;
  const status = deleted ? "Abgeschlossen" : closed ? (closed.includes("öffnet") ? "Startet bald" : closed.includes("noch nicht") ? "In Vorbereitung" : "Beendet") : "Live";

  return (
    <main className="min-h-[100dvh] bg-sand-50 pb-20">
      <header className="vb relative overflow-hidden" style={{ ["--a" as string]: event.accent_color, minHeight: 0 }}>
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
            {event.opens_at && event.closes_at && <span>· Gäste-Link aktiv {fmtDate(event.opens_at)} – {fmtDate(event.closes_at)}</span>}
          </div>
          {!deleted && <VbAppBar token={params.token} />}
        </div>
      </header>

      <div className="mx-auto -mt-4 max-w-4xl space-y-6 px-4">
        {/* 1 · Teilen */}
        <section className="relative rounded-3xl bg-white p-6 shadow-card">
          <Step n={1} title="Teilen & aufstellen" hint="Druck den Aufsteller aus oder schick den Link vorab an eure Gäste." />
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
                <a href={`/vb/${event.slug}`} target="_blank" className="rounded-full border border-anthracite-200 bg-white px-4 py-2.5 text-sm font-medium text-anthracite-800 hover:border-gold-400">
                  Selbst ausprobieren
                </a>
              </div>
            </div>
            <div className="mx-auto w-40 rounded-2xl border border-anthracite-100 bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          {event.wall_enabled && (
            <p className="mt-4 text-xs text-anthracite-500">
              Tipp: Die Foto-Wand am Laptop öffnen, mit Beamer oder TV verbinden und mit F11 bzw. ⌃⌘F auf Vollbild schalten – neue Fotos erscheinen automatisch.
            </p>
          )}
        </section>

        {/* 2 · Gestalten */}
        <section className="rounded-3xl bg-white p-6 shadow-card">
          <Step n={2} title="Gestalten" hint={`Aktuell: Vorlage „${t.name}“. Änderungen gelten sofort für alle neuen Fotos.`} />
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
                }}
              />
            )}
          </div>
        </section>

        {/* Spiele: passend zum Anlass oben, der Rest eingeklappt */}
        {(() => {
          const missions = (n: number) => (
            <section key="m" className="rounded-3xl bg-white p-6 shadow-card">
              <Step n={n} title="Foto-Missionen & Bestenliste" hint="Das Highlight für eure Gäste: Foto-Aufgaben mit Punkten – die Besten erscheinen live auf der Foto-Wand." />
              <div className="mt-5">
                {deleted ? (
                  <p className="text-sm text-anthracite-500">Dieses Event ist abgeschlossen.</p>
                ) : (
                  <VbChallengesEditor action={updateVbChallenges.bind(null, params.token)} initial={parseChallenges(event.challenges)} galleryEnabled={event.gallery_enabled} />
                )}
              </div>
            </section>
          );
          const reveal = (n: number) => (
            <section key="r" className="rounded-3xl bg-white p-6 shadow-card">
              <Step n={n} title="Tippspiel / Gender Reveal" hint="Junge oder Mädchen? Gäste tippen, die Foto-Wand zeigt den Stand – ihr löst live auf." />
              <div className="mt-5">
                <VbRevealEditor action={updateVbReveal.bind(null, params.token)} initial={parseReveal(event.reveal)} counts={tips} />
              </div>
            </section>
          );
          const leads = (n: number) => (
            <section key="l" className="rounded-3xl bg-white p-6 shadow-card">
              <Step n={n} title="Kontakte & Gewinnspiel" hint="Für Firmen-Events: Gäste tragen sich freiwillig ein – ihr bekommt die Kontakte als CSV." />
              <div className="mt-5">
                <VbLeadsEditor action={updateVbLeads.bind(null, params.token)} initial={parseLeadConfig(event.leads)} count={leadCount} csvUrl={`/api/vb/verwalten/${params.token}/kontakte`} />
              </div>
            </section>
          );
          // oben: passt zum Anlass oder ist schon eingeschaltet
          const items = [
            { key: "missions", top: fit.missions || parseChallenges(event.challenges).length > 0, render: missions, done: false },
            { key: "leads", top: fit.leads || parseLeadConfig(event.leads).enabled, render: leads, done: deleted },
            { key: "reveal", top: fit.reveal || parseReveal(event.reveal).enabled, render: reveal, done: deleted },
          ];
          const top = items.filter((i) => i.top && !i.done);
          const more = items.filter((i) => !i.top && !i.done);
          return (
            <>
              {top.map((i, n) => i.render(3 + n))}
              {more.length > 0 && (
                <details className="group rounded-3xl bg-white p-6 shadow-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                      <span className="block font-serif text-xl font-semibold text-anthracite-800">Weitere Spiele &amp; Extras</span>
                      <span className="mt-0.5 block text-sm text-anthracite-500">
                        {more.map((i) => (i.key === "missions" ? "🎯 Missionen" : i.key === "reveal" ? "🔮 Tippspiel" : "🎁 Gewinnspiel")).join(" · ")} – passt nicht zu jedem Anlass, aber jederzeit möglich
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

        {/* 4 · Fotos */}
        <section className="rounded-3xl bg-white p-6 shadow-card">
          <Step n={3 + photoStep} title="Eure Fotos" hint="Hier seht ihr alle Fotos, die Gäste für die Galerie freigegeben haben." />
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Kpi label="Fotos" value={photoTotal ?? 0} />
            <Kpi label="Gäste" value={new Set((guests ?? []).map((g) => g.guest_key)).size} />
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

function Step({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-anthracite-900 text-sm font-bold text-white">{n || "★"}</span>
      <div>
        <h2 className="font-serif text-xl font-semibold text-anthracite-800">{title}</h2>
        <p className="mt-0.5 text-sm text-anthracite-500">{hint}</p>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-sand-50 px-3 py-4">
      <div className="font-serif text-2xl font-semibold text-anthracite-800">{value}</div>
      <div className="mt-0.5 text-xs text-anthracite-500">{label}</div>
    </div>
  );
}

async function tipCounts(eventId: string) {
  const { data } = await createAdminClient().from("vb_tips").select("choice").eq("event_id", eventId).limit(10000);
  return { a: (data ?? []).filter((t) => t.choice === "a").length, b: (data ?? []).filter((t) => t.choice === "b").length };
}

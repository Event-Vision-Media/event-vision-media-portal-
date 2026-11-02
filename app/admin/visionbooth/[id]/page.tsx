import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CopyField } from "@/components/admin/CopyField";
import { VbEventForm } from "@/components/admin/visionbooth/VbEventForm";
import { VbPhotoGrid } from "@/components/admin/visionbooth/VbPhotoGrid";
import { VbDeleteButton } from "@/components/admin/visionbooth/VbDeleteButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { vbClosedReason, vbDeleteAfter, vbGuestUrl, vbManageUrl, VB_BUCKET, type VbEvent } from "@/lib/visionbooth";
import { VbSendManageLink } from "@/components/admin/visionbooth/VbSendManageLink";
import { VbChallengesEditor } from "@/components/visionbooth/customer/VbChallengesEditor";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { updateVbChallengesAdmin, updateVbLeadsAdmin } from "@/app/actions/admin-visionbooth";
import { VbLeadsEditor } from "@/components/visionbooth/customer/VbLeadsEditor";
import { parseLeadConfig } from "@/components/visionbooth/leads";
import { listVbLeads } from "@/lib/visionbooth-leads";
import { VB_STYLES } from "@/lib/visionbooth-ai";
import { getTemplate } from "@/components/visionbooth/templates";

export const dynamic = "force-dynamic";

const berlinDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) : "");

export default async function AdminVisionBoothEventPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const supabase = createAdminClient();
  const { data } = await supabase.from("vb_events").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const event = data as VbEvent & { package: string; contact_name: string | null; contact_email: string | null };

  const [{ data: photoRows }, { count: photoTotal }, { count: aiDone }, { data: aiStyleRows }, { count: aiFailed }, { data: guests }] = await Promise.all([
    supabase.from("vb_photos").select("id, kind, style, file_path, hidden, created_at").eq("event_id", event.id).order("created_at", { ascending: false }).limit(120),
    supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabase.from("vb_ai_jobs").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "fertig"),
    supabase.from("vb_ai_jobs").select("style").eq("event_id", event.id).eq("status", "fertig").limit(5000),
    supabase.from("vb_ai_jobs").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "fehler"),
    supabase.from("vb_photos").select("guest_key").eq("event_id", event.id).not("guest_key", "is", null).limit(5000),
  ]);

  const paths = [...(photoRows ?? []).map((p) => p.file_path), ...(event.logo_path ? [event.logo_path] : [])];
  const { data: signed } = paths.length ? await supabase.storage.from(VB_BUCKET).createSignedUrls(paths, 60 * 60) : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const photos = (photoRows ?? []).map((p) => ({ id: p.id, kind: p.kind, style: p.style, hidden: p.hidden, createdAt: p.created_at, url: url.get(p.file_path) ?? "" }));

  const guestUrl = vbGuestUrl(event.slug);
  const qrSvg = await QRCode.toString(guestUrl, { type: "svg", margin: 1 });
  const closed = vbClosedReason(event);
  const uniqueGuests = new Set((guests ?? []).map((g) => g.guest_key)).size;

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/visionbooth" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Alle VisionBooth-Events
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-anthracite-800">{event.title}</h1>
          {closed ? <Badge tone="neutral">{closed.includes("noch nicht") ? "Entwurf" : closed.includes("öffnet") ? "Geplant" : "Beendet"}</Badge> : <Badge tone="success">Live</Badge>}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">Gäste-Link</h2>
              <div className="mt-3">
                <CopyField value={guestUrl} />
              </div>
              {event.gallery_enabled && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-anthracite-500">Galerie-Link für den Kunden</p>
                  <CopyField value={`${guestUrl}/galerie`} />
                </div>
              )}
              <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50/60 p-3">
                <p className="mb-1.5 text-xs font-semibold text-anthracite-600">Kunden-Link (Design, QR-Aufsteller, Fotos) – nicht öffentlich teilen</p>
                <CopyField value={vbManageUrl(event.manage_token)} />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a href={`/vb/verwalten/${event.manage_token}`} target="_blank" className="text-sm font-medium text-gold-700 hover:underline">Kundenbereich öffnen →</a>
                  <VbSendManageLink eventId={event.id} email={event.contact_email} />
                </div>
              </div>
              {closed && <p className="mt-2 text-xs text-gold-700">Gäste sehen gerade: „{closed}“</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <a href={`/vb/${event.slug}`} target="_blank" className="rounded-lg border border-anthracite-200 bg-white px-3 py-2 hover:border-gold-300">📱 Gäste-Seite öffnen</a>
                {event.gallery_enabled && <a href={`/vb/${event.slug}/galerie`} target="_blank" className="rounded-lg border border-anthracite-200 bg-white px-3 py-2 hover:border-gold-300">🖼️ Galerie öffnen</a>}
                {event.wall_enabled && <a href={`/vb/${event.slug}/wall`} target="_blank" className="rounded-lg border border-anthracite-200 bg-white px-3 py-2 hover:border-gold-300">🖥️ Foto-Wand öffnen</a>}
                <a href={`/admin/visionbooth/${event.id}/qr`} target="_blank" className="rounded-lg border border-anthracite-200 bg-white px-3 py-2 hover:border-gold-300">🖨️ QR-Aufsteller drucken</a>
              </div>
            </Card>

            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">Einstellungen</h2>
              <div className="mt-4">
                <VbEventForm
                  event={{
                    id: event.id,
                    title: event.title,
                    eventDate: event.event_date ?? "",
                    package: event.package,
                    status: event.status,
                    contactName: event.contact_name ?? "",
                    contactEmail: event.contact_email ?? "",
                    frameText: event.frame_text ?? "",
                    template: getTemplate(event.template ?? event.frame_style).id,
                    subtext: event.frame_subtext ?? "",
                    accent: event.accent_color,
                    logoUrl: event.logo_path ? url.get(event.logo_path) ?? null : null,
                    opensDate: berlinDate(event.opens_at),
                    closesDate: berlinDate(event.closes_at),
                    aiEnabled: event.ai_enabled,
                    aiStyles: event.ai_styles,
                    aiLimit: event.ai_limit,
                    aiPerGuest: event.ai_per_guest,
                    wallEnabled: event.wall_enabled,
                    galleryEnabled: event.gallery_enabled,
                    formats: event.formats ?? ["einzel"],
                    retentionDays: event.retention_days ?? 90,
                    deleteAfterLabel: (event.photos_deleted_at ? new Date(event.photos_deleted_at) : vbDeleteAfter(event)).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
                    photosDeleted: Boolean(event.photos_deleted_at),
                  }}
                  styles={Object.entries(VB_STYLES).map(([key, s]) => ({ key, label: s.label, emoji: s.emoji }))}
                />
              </div>
            </Card>

            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">🎯 Foto-Missionen</h2>
              <div className="mt-4">
                <VbChallengesEditor action={updateVbChallengesAdmin.bind(null, event.id)} initial={parseChallenges(event.challenges)} galleryEnabled={event.gallery_enabled} />
              </div>
            </Card>

            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">🎁 Kontakte & Gewinnspiel</h2>
              <div className="mt-4">
                <VbLeadsEditor action={updateVbLeadsAdmin.bind(null, event.id)} initial={parseLeadConfig(event.leads)} count={(await listVbLeads(event.id)).length} csvUrl={`/api/admin/vb-kontakte/${event.id}`} />
              </div>
            </Card>

            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-lg font-semibold text-anthracite-800">Fotos</h2>
                <p className="text-xs text-anthracite-400">{(photoTotal ?? 0) > photos.length ? `die neuesten ${photos.length} von ${photoTotal}` : `${photoTotal ?? 0} insgesamt`}</p>
              </div>
              <p className="mt-1 text-xs text-anthracite-400">Nur Fotos von Gästen, die der Galerie zugestimmt haben. Ausgeblendete Fotos erscheinen nicht mehr auf Wand und Galerie.</p>
              <div className="mt-4">
                <VbPhotoGrid eventId={event.id} photos={photos} />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">Zahlen</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-anthracite-500">Fotos in der Galerie</dt><dd className="font-semibold text-anthracite-800">{photoTotal ?? 0}</dd></div>
                <div className="flex justify-between"><dt className="text-anthracite-500">Gäste (Geräte)</dt><dd className="font-semibold text-anthracite-800">{uniqueGuests}</dd></div>
                <div className="flex justify-between"><dt className="text-anthracite-500">KI-Bilder</dt><dd className="font-semibold text-anthracite-800">{aiDone ?? 0} / {event.ai_limit}</dd></div>
                {(aiFailed ?? 0) > 0 && <div className="flex justify-between"><dt className="text-anthracite-500">KI fehlgeschlagen</dt><dd className="text-anthracite-600">{aiFailed}</dd></div>}
                <div className="flex justify-between"><dt className="text-anthracite-500">KI-Kosten ca.</dt><dd className="text-anthracite-600">{(aiStyleRows ?? []).reduce((sum, r) => sum + (VB_STYLES[r.style]?.costUsd ?? 0.12), 0).toLocaleString("de-DE", { style: "currency", currency: "USD" })}</dd></div>
              </dl>
            </Card>

            <Card>
              <h2 className="font-serif text-lg font-semibold text-anthracite-800">QR-Code</h2>
              <div className="mx-auto mt-3 w-48" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <a
                href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
                download={`visionbooth-${event.slug}.svg`}
                className="mt-3 block text-center text-sm font-medium text-gold-700 hover:underline"
              >
                QR-Code als Datei (SVG) ↓
              </a>
            </Card>

            <VbDeleteButton eventId={event.id} title={event.title} />
          </div>
        </div>
      </main>
    </div>
  );
}

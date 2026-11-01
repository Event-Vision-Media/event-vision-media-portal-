import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { VB_STYLES } from "@/lib/visionbooth-ai";
import { getTemplate } from "@/components/visionbooth/templates";

// VisionBooth: digitale Fotobox per QR-Code (Tabellen vb_*, Bucket "visionbooth", Migration 0029).

export const VB_BUCKET = "visionbooth";
/** Max. Größe eines Gäste-Uploads (fertiges JPEG mit Rahmen). */
export const VB_MAX_UPLOAD = 8 * 1024 * 1024;

export interface VbEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string | null;
  status: "entwurf" | "aktiv" | "beendet";
  opens_at: string | null;
  closes_at: string | null;
  frame_text: string | null;
  frame_style: "gold" | "weiss" | "schwarz" | "ohne";
  template: string | null;
  frame_subtext: string | null;
  formats: string[] | null;
  retention_days: number;
  photos_deleted_at: string | null;
  /** Geheimer Verwaltungs-Link für den Kunden */
  manage_token: string;
  contact_name: string | null;
  contact_email: string | null;
  package: string;
  created_at: string;
  accent_color: string;
  logo_path: string | null;
  ai_enabled: boolean;
  ai_styles: string[];
  ai_limit: number;
  ai_per_guest: number;
  wall_enabled: boolean;
  gallery_enabled: boolean;
}

/** Was die Gäste-Seite vom Event kennen darf (keine Kontaktdaten, keine Buchung). */
export interface VbGuestEvent {
  slug: string;
  title: string;
  frameText: string;
  template: string;
  subtext: string;
  accent: string;
  logoUrl: string | null;
  galleryEnabled: boolean;
  aiStyles: { key: string; label: string; emoji: string; waits: string[]; seconds: number }[];
  aiPerGuest: number;
  formats: ("einzel" | "streifen")[];
  /** Fotos werden automatisch gelöscht am (ISO-Datum) */
  deleteAfter: string;
}

/** Event über den geheimen Verwaltungs-Link des Kunden laden. */
export async function loadVbEventByToken(token: string): Promise<VbEvent | null> {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  const { data } = await createAdminClient().from("vb_events").select("*").eq("manage_token", token).maybeSingle();
  return (data as VbEvent | null) ?? null;
}

export async function loadVbEvent(slug: string): Promise<VbEvent | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const { data } = await createAdminClient().from("vb_events").select("*").eq("slug", slug).maybeSingle();
  return (data as VbEvent | null) ?? null;
}

/** Warum der Gäste-Link gerade nicht nutzbar ist – oder null, wenn alles offen ist. */
export function vbClosedReason(e: VbEvent, now = new Date()): string | null {
  if (e.status === "entwurf") return "Diese Fotobox ist noch nicht freigeschaltet.";
  if (e.status === "beendet") return "Diese Fotobox ist beendet. Danke fürs Mitmachen!";
  if (e.opens_at && now < new Date(e.opens_at)) return "Die Fotobox öffnet zum Event – schau dann gern wieder vorbei.";
  if (e.closes_at && now > new Date(e.closes_at)) return "Diese Fotobox ist beendet. Danke fürs Mitmachen!";
  return null;
}

export async function toGuestEvent(e: VbEvent): Promise<VbGuestEvent> {
  let logoUrl: string | null = null;
  if (e.logo_path) {
    const { data } = await createAdminClient().storage.from(VB_BUCKET).createSignedUrl(e.logo_path, 60 * 60 * 12);
    logoUrl = data?.signedUrl ?? null;
  }
  return {
    slug: e.slug,
    title: e.title,
    frameText: e.frame_text || e.title,
    template: getTemplate(e.template ?? e.frame_style).id,
    subtext: e.frame_subtext ?? "",
    accent: /^#[0-9a-f]{6}$/i.test(e.accent_color) ? e.accent_color : "#c4933f",
    logoUrl,
    galleryEnabled: e.gallery_enabled,
    aiStyles: e.ai_enabled && e.ai_limit > 0 ? e.ai_styles.filter((k) => VB_STYLES[k]).map((k) => ({ key: k, label: VB_STYLES[k].label, emoji: VB_STYLES[k].emoji, waits: VB_STYLES[k].waits, seconds: VB_STYLES[k].seconds })) : [],
    aiPerGuest: e.ai_per_guest,
    deleteAfter: vbDeleteAfter(e).toISOString().slice(0, 10),
    formats: (() => {
      const f = (e.formats ?? []).filter((x): x is "einzel" | "streifen" => x === "einzel" || x === "streifen");
      return f.length ? f : ["einzel"];
    })(),
  };
}

/**
 * Basis-Adresse für Gäste-Links und QR-Codes. Später eigene Domain (VB_PUBLIC_URL,
 * z. B. https://visionbooth.de), bis dahin die Adresse, unter der das Portal gerade läuft.
 */
export function vbBaseUrl(): string {
  const env = process.env.VB_PUBLIC_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const vbGuestUrl = (slug: string) => `${vbBaseUrl()}/vb/${slug}`;
export const vbManageUrl = (token: string) => `${vbBaseUrl()}/vb/verwalten/${token}`;

/** Fotos werden so viele Tage nach Ende des Gäste-Links gelöscht (Admin: 30–365). */
export const VB_RETENTION_CHOICES = [30, 60, 90, 180, 365];

/** Stichtag der automatischen Löschung: Ende des Gäste-Links (sonst Event-Tag bzw. Anlage) + Frist. */
export function vbDeleteAfter(e: Pick<VbEvent, "closes_at" | "event_date" | "retention_days"> & { created_at?: string }): Date {
  const base = e.closes_at ? new Date(e.closes_at) : e.event_date ? new Date(`${e.event_date}T23:59:00+01:00`) : new Date(e.created_at ?? Date.now());
  return new Date(base.getTime() + (e.retention_days || 90) * 86_400_000);
}

/**
 * Datenschutz: Fotos abgelaufener Events löschen (Speicher + Datenbank), Logo bleibt.
 * Läuft im täglichen Cron. dryRun = nur auflisten.
 */
export async function cleanupVbPhotos(dryRun = false): Promise<{ event: string; photos: number; deleted: boolean }[]> {
  const supabase = createAdminClient();
  const { data: events } = await supabase
    .from("vb_events")
    .select("id, slug, title, closes_at, event_date, retention_days, created_at, logo_path")
    .is("photos_deleted_at", null)
    .limit(200);
  const out: { event: string; photos: number; deleted: boolean }[] = [];
  for (const e of events ?? []) {
    if (vbDeleteAfter(e) > new Date()) continue;
    const { count } = await supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", e.id);
    if (dryRun) {
      out.push({ event: e.slug, photos: count ?? 0, deleted: false });
      continue;
    }
    const bucket = supabase.storage.from(VB_BUCKET);
    let failed = false;
    for (let round = 0; round < 50; round++) {
      const { data: files } = await bucket.list(e.id, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${e.id}/${f.name}`).filter((p) => p !== e.logo_path);
      if (!paths.length) break;
      const { error } = await bucket.remove(paths);
      if (error) {
        console.error("VisionBooth-Löschung:", e.slug, error);
        failed = true;
        break;
      }
    }
    if (failed) {
      out.push({ event: e.slug, photos: count ?? 0, deleted: false });
      continue;
    }
    await supabase.from("vb_ai_jobs").delete().eq("event_id", e.id);
    await supabase.from("vb_photos").delete().eq("event_id", e.id);
    await supabase.from("vb_events").update({ photos_deleted_at: new Date().toISOString(), status: "beendet" }).eq("id", e.id);
    out.push({ event: e.slug, photos: count ?? 0, deleted: true });
  }
  return out;
}

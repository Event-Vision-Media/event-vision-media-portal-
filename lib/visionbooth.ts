import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { VB_STYLES } from "@/lib/visionbooth-ai";

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
  frameStyle: VbEvent["frame_style"];
  accent: string;
  logoUrl: string | null;
  galleryEnabled: boolean;
  aiStyles: { key: string; label: string; emoji: string; waits: string[]; seconds: number }[];
  aiPerGuest: number;
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
    frameStyle: e.frame_style,
    accent: /^#[0-9a-f]{6}$/i.test(e.accent_color) ? e.accent_color : "#c4933f",
    logoUrl,
    galleryEnabled: e.gallery_enabled,
    aiStyles: e.ai_enabled && e.ai_limit > 0 ? e.ai_styles.filter((k) => VB_STYLES[k]).map((k) => ({ key: k, label: VB_STYLES[k].label, emoji: VB_STYLES[k].emoji, waits: VB_STYLES[k].waits, seconds: VB_STYLES[k].seconds })) : [],
    aiPerGuest: e.ai_per_guest,
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

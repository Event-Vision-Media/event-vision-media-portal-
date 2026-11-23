import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { GALLERY_BUCKET, GALLERY_DAYS, type GalleryItemView } from "@/lib/event-gallery";
import type { Booking } from "@/lib/types";

export interface EventGallery {
  id: string;
  booking_id: string;
  token: string;
  title: string | null;
  published_at: string | null;
  expires_at: string | null;
  extension_days: number;
  extension_price: number;
  views: number;
  deleted_at: string | null;
}

export function galleryPublicUrl(token: string): string {
  const base = (process.env.PORTAL_URL || "https://portal.fotobox-essen.com").replace(/\/$/, "");
  return `${base}/g/${token}`;
}

export async function getGalleryForBooking(bookingId: string): Promise<EventGallery | null> {
  const { data } = await createAdminClient().from("event_galleries").select("*").eq("booking_id", bookingId).maybeSingle();
  return (data as EventGallery | null) ?? null;
}

export async function getGalleryByToken(token: string): Promise<EventGallery | null> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return null;
  const { data } = await createAdminClient().from("event_galleries").select("*").eq("token", token).maybeSingle();
  return (data as EventGallery | null) ?? null;
}

/** Galerie anlegen (Titel aus der Buchung), falls noch keine existiert. */
export async function ensureGallery(b: Booking): Promise<EventGallery> {
  const existing = await getGalleryForBooking(b.id);
  if (existing) return existing;
  const date = new Date(b.event_date + "T12:00:00Z").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const who = b.company?.trim() || b.couple_names?.trim() || b.customer_name?.trim() || "";
  const title = [b.occasion, who].filter(Boolean).join(" · ") + ` · ${date}`;
  const { data, error } = await createAdminClient()
    .from("event_galleries")
    .insert({ booking_id: b.id, token: randomBytes(9).toString("base64url"), title: title.replace(/^ · /, "") })
    .select("*")
    .single();
  if (error) return (await getGalleryForBooking(b.id))!;
  return data as EventGallery;
}

export type GalleryState = "entwurf" | "online" | "abgelaufen" | "geloescht";
export function galleryState(g: Pick<EventGallery, "published_at" | "expires_at" | "deleted_at">, now = new Date()): GalleryState {
  if (g.deleted_at) return "geloescht";
  if (!g.published_at) return "entwurf";
  if (g.expires_at && new Date(g.expires_at) < now) return "abgelaufen";
  return "online";
}

export const expiryAfterPublish = (publishedAt: Date, extraDays = 0) => new Date(publishedAt.getTime() + (GALLERY_DAYS + extraDays) * 86_400_000).toISOString();

/** Einträge mit signierten Links (Vorschaubild, Abspielen, Herunterladen) – Links gelten 6 Stunden. */
export async function galleryItems(galleryId: string): Promise<GalleryItemView[]> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase.from("event_gallery_items").select("*").eq("gallery_id", galleryId).order("sort").order("created_at").limit(1000);
  const items = rows ?? [];
  if (!items.length) return [];
  const ttl = 6 * 3600;
  const store = supabase.storage.from(GALLERY_BUCKET);
  const [thumbs, srcs] = await Promise.all([
    store.createSignedUrls(items.map((i) => i.thumb_path).filter(Boolean) as string[], ttl),
    store.createSignedUrls(items.map((i) => i.file_path), ttl),
  ]);
  const thumbBy = new Map((thumbs.data ?? []).map((t) => [t.path, t.signedUrl]));
  const srcBy = new Map((srcs.data ?? []).map((t) => [t.path, t.signedUrl]));
  return items.map((i, n) => {
    const src = srcBy.get(i.file_path) ?? "";
    const name = i.file_name || `video-${n + 1}.mp4`;
    return {
      id: i.id,
      name,
      thumb: i.thumb_path ? thumbBy.get(i.thumb_path) ?? null : null,
      src,
      // Supabase: ?download=Dateiname erzwingt den Download statt Abspielen
      download: src ? `${src}${src.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}` : "",
      duration: i.duration_sec != null ? Number(i.duration_sec) : null,
      size: i.size_bytes != null ? Number(i.size_bytes) : null,
    };
  });
}

/** Abgelaufene Galerien (1 Tag Kulanz) samt Dateien löschen – täglicher Cron. */
export async function cleanupExpiredGalleries(dryRun = false): Promise<{ gallery: string; files: number }[]> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  const { data: due } = await supabase.from("event_galleries").select("id, token").is("deleted_at", null).not("expires_at", "is", null).lt("expires_at", cutoff).limit(50);
  const out: { gallery: string; files: number }[] = [];
  for (const g of due ?? []) {
    const { data: items } = await supabase.from("event_gallery_items").select("file_path, thumb_path").eq("gallery_id", g.id).limit(2000);
    const paths = (items ?? []).flatMap((i) => [i.file_path, i.thumb_path].filter(Boolean) as string[]);
    if (!dryRun) {
      for (let k = 0; k < paths.length; k += 500) await supabase.storage.from(GALLERY_BUCKET).remove(paths.slice(k, k + 500));
      await supabase.from("event_gallery_items").delete().eq("gallery_id", g.id);
      await supabase.from("event_galleries").update({ deleted_at: new Date().toISOString() }).eq("id", g.id);
    }
    out.push({ gallery: g.token, files: paths.length });
  }
  return out;
}

"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { bookingDevices } from "@/lib/audience";
import { GALLERY_BUCKET, MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/event-gallery";
import { ensureGallery, expiryAfterPublish, galleryPublicUrl, getGalleryForBooking } from "@/lib/event-gallery-server";
import type { Booking } from "@/lib/types";

type Result<T = object> = ({ error: string } | ({ error?: undefined } & T));

async function bookingOrNull(id: string): Promise<Booking | null> {
  const { data } = await createAdminClient().from("bookings").select("*").eq("id", id).maybeSingle();
  return (data as Booking | null) ?? null;
}

/** Signierte Upload-Links: Videos gehen direkt aus dem Browser in den Speicher (kein Größenlimit des Servers). */
export async function prepareGalleryUploads(
  bookingId: string,
  files: { name: string; type: string; size: number; thumb: boolean }[]
): Promise<Result<{ uploads: { video: { path: string; token: string }; thumb: { path: string; token: string } | null }[] }>> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const b = await bookingOrNull(bookingId);
  if (!b) return { error: "Buchung nicht gefunden." };
  if (files.length > 300) return { error: "Bitte höchstens 300 Videos auf einmal." };
  for (const f of files) {
    if (!VIDEO_TYPES.includes(f.type)) return { error: `„${f.name}“ ist kein unterstütztes Video (MP4, MOV oder WebM).` };
    if (f.size > MAX_VIDEO_BYTES) return { error: `„${f.name}“ ist größer als 500 MB.` };
  }
  const g = await ensureGallery(b);
  const store = createAdminClient().storage.from(GALLERY_BUCKET);
  const uploads = [];
  for (const f of files) {
    const id = randomUUID();
    const ext = f.type === "video/quicktime" ? "mov" : f.type === "video/webm" ? "webm" : "mp4";
    const v = await store.createSignedUploadUrl(`${g.id}/${id}.${ext}`);
    if (v.error || !v.data) return { error: "Upload konnte nicht vorbereitet werden. Bitte erneut versuchen." };
    let t = null;
    if (f.thumb) {
      const r = await store.createSignedUploadUrl(`${g.id}/${id}-t.jpg`);
      if (r.data) t = { path: r.data.path, token: r.data.token };
    }
    uploads.push({ video: { path: v.data.path, token: v.data.token }, thumb: t });
  }
  return { uploads };
}

/** Nach erfolgreichem Upload: Videos in der Galerie eintragen. */
export async function registerGalleryItems(
  bookingId: string,
  items: { file_path: string; thumb_path: string | null; file_name: string; size_bytes: number; duration_sec: number | null }[]
): Promise<Result> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const g = await getGalleryForBooking(bookingId);
  if (!g) return { error: "Galerie nicht gefunden." };
  const supabase = createAdminClient();
  const { count } = await supabase.from("event_gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", g.id);
  const rows = items
    .filter((i) => i.file_path.startsWith(`${g.id}/`) && (!i.thumb_path || i.thumb_path.startsWith(`${g.id}/`)))
    .map((i, n) => ({ gallery_id: g.id, file_path: i.file_path, thumb_path: i.thumb_path, file_name: i.file_name.slice(0, 200), size_bytes: Math.round(i.size_bytes), duration_sec: i.duration_sec, sort: (count ?? 0) + n }));
  if (rows.length) {
    const { error } = await supabase.from("event_gallery_items").insert(rows);
    if (error) return { error: "Videos konnten nicht gespeichert werden." };
    await logActivity(bookingId, "galerie_upload", `🎬 ${rows.length} Video${rows.length === 1 ? "" : "s"} in die Online-Galerie hochgeladen.`);
  }
  revalidatePath(`/admin/bookings/${bookingId}`);
  return {};
}

export async function deleteGalleryItem(bookingId: string, itemId: string): Promise<Result> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const g = await getGalleryForBooking(bookingId);
  if (!g) return { error: "Galerie nicht gefunden." };
  const supabase = createAdminClient();
  const { data: item } = await supabase.from("event_gallery_items").select("file_path, thumb_path").eq("id", itemId).eq("gallery_id", g.id).maybeSingle();
  if (!item) return { error: "Video nicht gefunden." };
  await supabase.storage.from(GALLERY_BUCKET).remove([item.file_path, item.thumb_path].filter(Boolean) as string[]);
  await supabase.from("event_gallery_items").delete().eq("id", itemId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  return {};
}

export async function updateGalleryTitle(bookingId: string, title: string): Promise<Result> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const g = await getGalleryForBooking(bookingId);
  if (!g) return { error: "Galerie nicht gefunden." };
  await createAdminClient().from("event_galleries").update({ title: title.replace(/\s+/g, " ").trim().slice(0, 120) || null }).eq("id", g.id);
  revalidatePath(`/admin/bookings/${bookingId}`);
  return {};
}

/**
 * Freischalten: Galerie ist ab jetzt 30 Tage (plus Verlängerung) erreichbar. Reine 360°-Buchung ohne
 * Online-Galerie-Link: dieser Link wird dort hinterlegt – dann funktionieren
 * Kundenportal und „Kunde informieren“-Mail wie gewohnt.
 */
export async function publishGallery(bookingId: string): Promise<Result<{ url: string }>> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const b = await bookingOrNull(bookingId);
  const g = await getGalleryForBooking(bookingId);
  if (!b || !g) return { error: "Galerie nicht gefunden." };
  const supabase = createAdminClient();
  const { count } = await supabase.from("event_gallery_items").select("id", { count: "exact", head: true }).eq("gallery_id", g.id);
  if (!count) return { error: "Bitte zuerst Videos hochladen." };
  const now = new Date();
  const published = g.published_at ? new Date(g.published_at) : now;
  // Schon abgelaufen (aber noch nicht gelöscht): von dir kostenlos wieder 30 Tage ab heute
  const expired = g.expires_at && new Date(g.expires_at) < now;
  const expires = expired ? expiryAfterPublish(now) : expiryAfterPublish(published, g.extension_days);
  await supabase.from("event_galleries").update({ published_at: published.toISOString(), expires_at: expires, deleted_at: null }).eq("id", g.id);
  const url = galleryPublicUrl(g.token);
  // Nur bei reinen 360°-Buchungen – sonst bleibt das Feld frei für den Foto-Galerie-Link
  const devices = bookingDevices(b);
  const photoBooked = devices.has("fotobox") || devices.has("spiegel");
  if (!b.online_gallery_url && !photoBooked) await supabase.from("bookings").update({ online_gallery_url: url }).eq("id", b.id);
  if (!g.published_at || expired) await logActivity(bookingId, "galerie_online", `🎬 Online-Galerie ${expired ? "wieder " : ""}freigeschaltet (${count} Videos) – verfügbar bis ${new Date(expires).toLocaleDateString("de-DE")}.`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  return { url };
}

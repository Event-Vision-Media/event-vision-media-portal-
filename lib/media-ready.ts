import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingDevices } from "@/lib/audience";
import type { MediaReady } from "@/lib/email";
import type { Booking } from "@/lib/types";

/** Gebuchte Medien-Geräte und was davon schon bereitliegt (Galerie-Link, hochgeladene Audios). */
export async function mediaStatus(b: Booking): Promise<MediaReady & { photoBooked: boolean; videoBooked: boolean; audioBooked: boolean; galleryReady: boolean; informedAt: string | null }> {
  const supabase = createAdminClient();
  const devices = bookingDevices(b);
  const [{ count }, { data: informed }] = await Promise.all([
    supabase.from("audio_guestbook_recordings").select("id", { count: "exact", head: true }).eq("booking_id", b.id),
    supabase.from("activity_log").select("created_at").eq("booking_id", b.id).eq("event_type", "mail_bereit").order("created_at", { ascending: false }).limit(1),
  ]);
  const galleryReady = Boolean(b.online_gallery_url);
  const photoBooked = devices.has("spiegel") || devices.has("fotobox");
  const videoBooked = devices.has("360");
  return {
    // Galerie-Link gilt für alles Gebuchte: Fotos (Spiegel/Fotobox) bzw. Videos (360°)
    photos: galleryReady && photoBooked,
    videos: galleryReady && videoBooked,
    audios: count ?? 0,
    galleryReady,
    photoBooked,
    videoBooked,
    audioBooked: devices.has("audio"),
    informedAt: informed?.[0]?.created_at ?? null,
  };
}

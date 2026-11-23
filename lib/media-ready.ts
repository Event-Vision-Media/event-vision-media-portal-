import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingDevices } from "@/lib/audience";
import { galleryPublicUrl } from "@/lib/event-gallery-server";
import type { MediaReady } from "@/lib/email";
import type { Booking } from "@/lib/types";

/** Gebuchte Medien-Geräte und was davon schon bereitliegt (Galerie-Link, hochgeladene Audios). */
export async function mediaStatus(b: Booking): Promise<MediaReady & { photoBooked: boolean; videoBooked: boolean; audioBooked: boolean; galleryReady: boolean; informedAt: string | null }> {
  const supabase = createAdminClient();
  const devices = bookingDevices(b);
  const [{ count }, { data: informed }, { data: videoGallery }] = await Promise.all([
    supabase.from("audio_guestbook_recordings").select("id", { count: "exact", head: true }).eq("booking_id", b.id),
    supabase.from("activity_log").select("created_at").eq("booking_id", b.id).eq("event_type", "mail_bereit").order("created_at", { ascending: false }).limit(1),
    supabase.from("event_galleries").select("token, published_at, deleted_at").eq("booking_id", b.id).maybeSingle(),
  ]);
  const photoBooked = devices.has("spiegel") || devices.has("fotobox");
  const videoBooked = devices.has("360");
  // Eigene Video-Galerie (freigeschaltet) zählt für die 360°-Videos, der Galerie-Link für Fotos (und Videos, wenn keine eigene Galerie)
  const ownVideos = Boolean(videoGallery?.published_at && !videoGallery.deleted_at);
  // Steht im Galerie-Link nur die eigene Video-Galerie, sind die Fotos noch NICHT bereit
  const linkIsVideoGallery = Boolean(videoGallery && b.online_gallery_url === galleryPublicUrl(videoGallery.token));
  const photosReady = photoBooked && Boolean(b.online_gallery_url) && !linkIsVideoGallery;
  const videosReady = videoBooked && (ownVideos || Boolean(b.online_gallery_url));
  const galleryReady = (!photoBooked || photosReady) && (!videoBooked || videosReady) && (photoBooked || videoBooked);
  return {
    photos: photosReady,
    videos: videosReady,
    audios: count ?? 0,
    galleryReady,
    photoBooked,
    videoBooked,
    audioBooked: devices.has("audio"),
    informedAt: informed?.[0]?.created_at ?? null,
  };
}

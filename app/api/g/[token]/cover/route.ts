import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GALLERY_BUCKET } from "@/lib/event-gallery";
import { getGalleryByToken, galleryState } from "@/lib/event-gallery-server";

export const dynamic = "force-dynamic";

/** Vorschaubild für WhatsApp & Co.: erstes Video der Galerie, sonst das Logo. */
export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const fallback = new URL("/logo-tile-lg.png", req.url);
  const g = await getGalleryByToken(token);
  if (!g || galleryState(g) !== "online") return NextResponse.redirect(fallback);
  const supabase = createAdminClient();
  const { data: first } = await supabase.from("event_gallery_items").select("thumb_path").eq("gallery_id", g.id).not("thumb_path", "is", null).order("sort").limit(1).maybeSingle();
  if (!first?.thumb_path) return NextResponse.redirect(fallback);
  const { data } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(first.thumb_path, 7 * 86400);
  return NextResponse.redirect(data?.signedUrl ?? fallback);
}

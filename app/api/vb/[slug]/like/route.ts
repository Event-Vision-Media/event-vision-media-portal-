import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Herz für ein Foto setzen oder entfernen – ein Herz pro Gerät und Foto. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || !event.gallery_enabled || event.status === "entwurf" || event.photos_deleted_at) {
    return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });
  }
  const key = cleanGuestKey(req.headers.get("x-vb-guest"));
  const body = await req.json().catch(() => ({}));
  const photoId = String(body?.photoId ?? "");
  if (!key || !/^[0-9a-f-]{36}$/.test(photoId)) return NextResponse.json({ error: "ungültig" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: photo } = await supabase.from("vb_photos").select("id").eq("id", photoId).eq("event_id", event.id).eq("hidden", false).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  if (body?.on === false) await supabase.from("vb_likes").delete().eq("photo_id", photoId).eq("guest_key", key);
  else await supabase.from("vb_likes").upsert({ photo_id: photoId, guest_key: key, event_id: event.id }, { ignoreDuplicates: true });

  // Zähler neu berechnen statt hoch-/runterzählen – bleibt auch bei Doppelklicks korrekt
  const { count } = await supabase.from("vb_likes").select("photo_id", { count: "exact", head: true }).eq("photo_id", photoId);
  await supabase.from("vb_photos").update({ likes: count ?? 0 }).eq("id", photoId);
  return NextResponse.json({ likes: count ?? 0 });
}

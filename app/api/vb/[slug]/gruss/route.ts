import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Gästebuch-Gruß zu einem eigenen Foto speichern (oder ändern). */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || !event.guestbook || !event.gallery_enabled || vbClosedReason(event) || event.photos_deleted_at) {
    return NextResponse.json({ error: "Das Gästebuch ist gerade nicht verfügbar." }, { status: 404 });
  }
  const key = cleanGuestKey(req.headers.get("x-vb-guest"));
  const body = await req.json().catch(() => ({}));
  const photoId = String(body?.photoId ?? "");
  const message = String(body?.message ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
  const name = String(body?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!key || !/^[0-9a-f-]{36}$/.test(photoId)) return NextResponse.json({ error: "ungültig" }, { status: 400 });
  if (message.length < 2) return NextResponse.json({ error: "Bitte schreib einen kurzen Gruß." }, { status: 400 });

  // nur das eigene Foto (gleiches Gerät) kann einen Gruß bekommen
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vb_photos")
    .update({ greeting: message, greeting_name: name || null })
    .eq("id", photoId)
    .eq("event_id", event.id)
    .eq("guest_key", key)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Das hat nicht geklappt – versuch es nochmal." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

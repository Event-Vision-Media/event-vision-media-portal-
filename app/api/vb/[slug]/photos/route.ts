import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, VB_BUCKET } from "@/lib/visionbooth";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { cleanGuestKey } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Links gelten 6 Stunden – reicht für einen Event-Abend an der Foto-Wand. */
const URL_TTL = 60 * 60 * 6;

/**
 * Neueste freigegebene Fotos eines Events für Foto-Wand und Galerie.
 * ?after=<ISO-Zeit> liefert nur neue Fotos (die Wand fragt alle paar Sekunden nach),
 * ?before=<ISO-Zeit> die nächste Seite älterer Fotos (Galerie),
 * ?sort=top die beliebtesten Fotos (meiste Herzen, ?offset= zum Nachladen).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || event.status === "entwurf" || (!event.wall_enabled && !event.gallery_enabled)) {
    return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });
  }
  const after = req.nextUrl.searchParams.get("after");
  const before = req.nextUrl.searchParams.get("before");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 40, 100);
  const top = req.nextUrl.searchParams.get("sort") === "top";
  // Eigene Fotos dieses Geräts (Reiter „Meine Fotos“, Löschen) – die Geräte-Kennung selbst wird nie ausgeliefert
  const me = cleanGuestKey(req.headers.get("x-vb-guest"));
  const mineOnly = req.nextUrl.searchParams.get("mine") === "1" && me;
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);

  const supabase = createAdminClient();
  let q = supabase
    .from("vb_photos")
    .select("id, kind, file_path, thumb_path, created_at, likes, challenge_id, guest_key")
    .eq("event_id", event.id)
    .eq("hidden", false);
  if (mineOnly) q = q.eq("guest_key", me);
  q = top
    ? q.gt("likes", 0).order("likes", { ascending: false }).order("created_at", { ascending: false }).range(offset, offset + limit - 1)
    : q.order("created_at", { ascending: false }).limit(limit);
  if (after && !isNaN(Date.parse(after))) q = q.gt("created_at", after);
  if (before && !isNaN(Date.parse(before))) q = q.lt("created_at", before);
  const { data: rows } = await q;
  if (!rows?.length) return NextResponse.json({ photos: [] });

  const files = [...rows.map((r) => r.file_path), ...rows.filter((r) => r.thumb_path).map((r) => r.thumb_path as string)];
  const { data: signed } = await supabase.storage.from(VB_BUCKET).createSignedUrls(files, URL_TTL);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Missionen mit Spitznamen (für „Mission erfüllt“ auf der Foto-Wand) – Geräte-Kennung bleibt intern
  const challenges = new Map(parseChallenges(event.challenges).map((c) => [c.id, c]));
  const keys = [...new Set(rows.filter((r) => r.challenge_id && r.guest_key).map((r) => r.guest_key as string))];
  const { data: guests } = keys.length ? await supabase.from("vb_guests").select("guest_key, name").eq("event_id", event.id).in("guest_key", keys) : { data: [] };
  const names = new Map((guests ?? []).map((g) => [g.guest_key, g.name]));

  return NextResponse.json({
    photos: rows
      .map((r) => {
        const ch = r.challenge_id ? challenges.get(r.challenge_id) : undefined;
        return {
          id: r.id,
          kind: r.kind,
          createdAt: r.created_at,
          likes: r.likes ?? 0,
          mine: Boolean(me && r.guest_key === me),
          url: urls.get(r.file_path) ?? null,
          thumb: (r.thumb_path && urls.get(r.thumb_path)) || null,
          mission: ch ? { emoji: ch.emoji, text: ch.text, points: ch.points, by: names.get(r.guest_key ?? "") ?? null } : null,
        };
      })
      .filter((p) => p.url),
  });
}

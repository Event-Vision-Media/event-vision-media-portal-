import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, VB_BUCKET } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/** Links gelten 6 Stunden – reicht für einen Event-Abend an der Foto-Wand. */
const URL_TTL = 60 * 60 * 6;

/**
 * Neueste freigegebene Fotos eines Events für Foto-Wand und Galerie.
 * ?after=<ISO-Zeit> liefert nur neue Fotos (die Wand fragt alle paar Sekunden nach),
 * ?before=<ISO-Zeit> die nächste Seite älterer Fotos (Galerie).
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || event.status === "entwurf" || (!event.wall_enabled && !event.gallery_enabled)) {
    return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });
  }
  const after = req.nextUrl.searchParams.get("after");
  const before = req.nextUrl.searchParams.get("before");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 40, 100);

  const supabase = createAdminClient();
  let q = supabase
    .from("vb_photos")
    .select("id, kind, file_path, created_at")
    .eq("event_id", event.id)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (after && !isNaN(Date.parse(after))) q = q.gt("created_at", after);
  if (before && !isNaN(Date.parse(before))) q = q.lt("created_at", before);
  const { data: rows } = await q;
  if (!rows?.length) return NextResponse.json({ photos: [] });

  const { data: signed } = await supabase.storage.from(VB_BUCKET).createSignedUrls(rows.map((r) => r.file_path), URL_TTL);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return NextResponse.json({
    photos: rows
      .map((r) => ({ id: r.id, kind: r.kind, createdAt: r.created_at, url: urls.get(r.file_path) ?? null }))
      .filter((p) => p.url),
  });
}

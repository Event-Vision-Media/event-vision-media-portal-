import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason, VB_BUCKET, VB_MAX_UPLOAD } from "@/lib/visionbooth";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { vbBoard } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Fotos pro Gerät und Minute – schützt vor Dauerfeuer, stört normale Gäste nicht. */
const PER_MINUTE = 12;
/** Eigene Fotos aus der Handy-Galerie: mehrere auf einmal, aber gedeckelt pro Tag */
const GAST_PER_MINUTE = 40;
const GAST_PER_DAY = 100;

/**
 * Gäste-Upload: das fertige Foto (JPEG) kommt als roher Body – oder als multipart mit
 * „photo“ und optional „thumb“ (kleines Vorschaubild, im Browser erzeugt).
 * Header x-vb-guest = zufällige Geräte-Kennung aus dem Browser (nur fürs Limit).
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const closed = vbClosedReason(event);
  if (closed) return NextResponse.json({ error: closed }, { status: 403 });

  const guestKey = (req.headers.get("x-vb-guest") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || null;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > VB_MAX_UPLOAD) return NextResponse.json({ error: "Foto zu groß" }, { status: 413 });

  let buf: Buffer;
  let thumb: Buffer | null = null;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    const photo = fd?.get("photo");
    const t = fd?.get("thumb");
    if (!(photo instanceof Blob)) return NextResponse.json({ error: "Ungültiges Foto" }, { status: 400 });
    buf = Buffer.from(await photo.arrayBuffer());
    if (t instanceof Blob && t.size > 1000 && t.size < 400_000) thumb = Buffer.from(await t.arrayBuffer());
  } else buf = Buffer.from(await req.arrayBuffer());
  const isJpeg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (buf.length < 1000 || buf.length > VB_MAX_UPLOAD) return NextResponse.json({ error: "Ungültiges Foto" }, { status: 400 });
  // JPEG-Signatur prüfen (FF D8 FF)
  if (!isJpeg(buf)) return NextResponse.json({ error: "Nur JPEG erlaubt" }, { status: 415 });
  if (thumb && !isJpeg(thumb)) thumb = null;

  const supabase = createAdminClient();
  const isGast = req.headers.get("x-vb-kind") === "gast";
  if (isGast && (!event.gallery_enabled || !guestKey)) return NextResponse.json({ error: "Die Galerie ist für Uploads nicht freigegeben." }, { status: 403 });
  if (guestKey) {
    const since = (ms: number) =>
      supabase
        .from("vb_photos")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("guest_key", guestKey)
        .eq("kind", isGast ? "gast" : "foto")
        .gte("created_at", new Date(Date.now() - ms).toISOString());
    const [{ count: perMin }, { count: perDay }] = await Promise.all([since(60_000), isGast ? since(86_400_000) : Promise.resolve({ count: 0 })]);
    if ((perMin ?? 0) >= (isGast ? GAST_PER_MINUTE : PER_MINUTE)) return NextResponse.json({ error: "Kurz durchatmen – gleich geht's weiter." }, { status: 429 });
    if (isGast && (perDay ?? 0) >= GAST_PER_DAY) return NextResponse.json({ error: `Du hast heute schon ${GAST_PER_DAY} Fotos geteilt – danke! Morgen geht's weiter.` }, { status: 429 });
  }

  const id = randomUUID();
  const path = `${event.id}/${id}.jpg`;
  const { error: upErr } = await supabase.storage.from(VB_BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: false });
  if (upErr) {
    console.error("VisionBooth-Upload:", upErr);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  // Vorschaubild neben dem Foto (gleicher Ordner – wird von der Löschfrist mit erfasst)
  let thumbPath: string | null = null;
  if (thumb) {
    const tp = `${event.id}/${id}-t.jpg`;
    const { error } = await supabase.storage.from(VB_BUCKET).upload(tp, thumb, { contentType: "image/jpeg", upsert: false });
    if (!error) thumbPath = tp;
  }
  const isAi = req.headers.get("x-vb-kind") === "ki";
  const kind = isAi ? "ki" : isGast ? "gast" : "foto";
  const style = isAi ? (req.headers.get("x-vb-style") ?? "").replace(/[^a-z]/g, "").slice(0, 30) || null : null;
  // Foto-Mission: nur echte Fotos (keine KI-Varianten) und nur Missionen dieses Events zählen
  const wanted = req.headers.get("x-vb-challenge");
  const challenge = kind === "foto" && guestKey && wanted ? parseChallenges(event.challenges).find((c) => c.id === wanted) ?? null : null;
  const { error: dbErr } = await supabase
    .from("vb_photos")
    .insert({ id, event_id: event.id, kind, style, file_path: path, thumb_path: thumbPath, guest_key: guestKey, challenge_id: challenge?.id ?? null });
  if (dbErr) {
    console.error("VisionBooth-Foto:", dbErr);
    await supabase.storage.from(VB_BUCKET).remove(thumbPath ? [path, thumbPath] : [path]);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  if (!challenge) return NextResponse.json({ ok: true, id });
  const board = await vbBoard(event, guestKey, 3);
  return NextResponse.json({ ok: true, id, mission: { id: challenge.id, points: challenge.points, total: board.me?.points ?? 0, rank: board.me?.rank ?? null, players: board.players } });
}

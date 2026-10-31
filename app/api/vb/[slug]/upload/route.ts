import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason, VB_BUCKET, VB_MAX_UPLOAD } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/** Fotos pro Gerät und Minute – schützt vor Dauerfeuer, stört normale Gäste nicht. */
const PER_MINUTE = 12;

/**
 * Gäste-Upload: das fertige Foto (JPEG mit Rahmen) kommt als roher Body.
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

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length < 1000 || buf.length > VB_MAX_UPLOAD) return NextResponse.json({ error: "Ungültiges Foto" }, { status: 400 });
  // JPEG-Signatur prüfen (FF D8 FF)
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return NextResponse.json({ error: "Nur JPEG erlaubt" }, { status: 415 });

  const supabase = createAdminClient();
  if (guestKey) {
    const { count } = await supabase
      .from("vb_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("guest_key", guestKey)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((count ?? 0) >= PER_MINUTE) return NextResponse.json({ error: "Kurz durchatmen – gleich geht's weiter." }, { status: 429 });
  }

  const id = randomUUID();
  const path = `${event.id}/${id}.jpg`;
  const { error: upErr } = await supabase.storage.from(VB_BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: false });
  if (upErr) {
    console.error("VisionBooth-Upload:", upErr);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  const isAi = req.headers.get("x-vb-kind") === "ki";
  const style = isAi ? (req.headers.get("x-vb-style") ?? "").replace(/[^a-z]/g, "").slice(0, 30) || null : null;
  const { error: dbErr } = await supabase
    .from("vb_photos")
    .insert({ id, event_id: event.id, kind: isAi ? "ki" : "foto", style, file_path: path, guest_key: guestKey });
  if (dbErr) {
    console.error("VisionBooth-Foto:", dbErr);
    await supabase.storage.from(VB_BUCKET).remove([path]);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id });
}

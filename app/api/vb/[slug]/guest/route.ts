import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Spitzname eines Gastes für die Bestenliste setzen oder ändern. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const closed = vbClosedReason(event);
  if (closed) return NextResponse.json({ error: closed }, { status: 403 });
  const key = cleanGuestKey(req.headers.get("x-vb-guest"));
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!key || name.length < 2) return NextResponse.json({ error: "Bitte gib einen Namen mit mindestens 2 Zeichen ein." }, { status: 400 });
  const { error } = await createAdminClient().from("vb_guests").upsert({ event_id: event.id, guest_key: key, name });
  if (error) return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  return NextResponse.json({ ok: true, name });
}

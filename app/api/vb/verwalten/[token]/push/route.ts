import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEventByToken } from "@/lib/visionbooth";
import { pushToEvent } from "@/lib/visionbooth-push";

export const dynamic = "force-dynamic";

/** Mitteilungen einschalten: Push-Abo des Gastgeber-Handys speichern (+ Begrüßung als Test). */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const event = await loadVbEventByToken(params.token);
  if (!event) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  const sub = await req.json().catch(() => null);
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  if (!/^https:\/\//.test(endpoint) || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "ungültig" }, { status: 400 });
  const { error } = await createAdminClient()
    .from("vb_push_subs")
    .upsert({ event_id: event.id, endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  await pushToEvent(event.id, { title: event.frame_text || event.title, body: "🔔 Mitteilungen sind an – wir melden neue Fotos und Tipps.", url: `/vb/verwalten/${params.token}`, tag: "hallo" });
  return NextResponse.json({ ok: true });
}

/** Mitteilungen ausschalten. */
export async function DELETE(req: NextRequest, { params }: { params: { token: string } }) {
  const event = await loadVbEventByToken(params.token);
  if (!event) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  const { endpoint } = await req.json().catch(() => ({ endpoint: "" }));
  await createAdminClient().from("vb_push_subs").delete().eq("event_id", event.id).eq("endpoint", String(endpoint));
  return NextResponse.json({ ok: true });
}

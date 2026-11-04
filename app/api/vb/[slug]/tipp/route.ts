import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";
import { vbRevealState } from "@/lib/visionbooth-reveal";
import { parseReveal } from "@/components/visionbooth/reveal";
import { notifyTips } from "@/lib/visionbooth-push";

export const dynamic = "force-dynamic";

/** Stand des Tippspiels (Gäste-App fragt regelmäßig nach – so kommt die Auflösung live an). */
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || event.status === "entwurf") return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });
  const state = await vbRevealState(event, cleanGuestKey(req.headers.get("x-vb-guest")));
  if (!state) return NextResponse.json({ error: "kein Tippspiel" }, { status: 404 });
  return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
}

/** Tipp abgeben oder ändern – bis zur Auflösung. */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const closed = vbClosedReason(event);
  if (closed) return NextResponse.json({ error: closed }, { status: 403 });
  const cfg = parseReveal(event.reveal);
  if (!cfg.enabled) return NextResponse.json({ error: "kein Tippspiel" }, { status: 404 });
  if (cfg.result) return NextResponse.json({ error: "Schon aufgelöst!" }, { status: 409 });
  const key = cleanGuestKey(req.headers.get("x-vb-guest"));
  const body = await req.json().catch(() => ({}));
  if (!key || (body?.choice !== "a" && body?.choice !== "b")) return NextResponse.json({ error: "ungültig" }, { status: 400 });
  const { error } = await createAdminClient().from("vb_tips").upsert({ event_id: event.id, guest_key: key, choice: body.choice, created_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  const state = await vbRevealState(event, key);
  if (state) await notifyTips(event, state.counts, [cfg.options[0].label, cfg.options[1].label]).catch(() => {});
  return NextResponse.json(state);
}

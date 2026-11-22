import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STEPS = ["offen", "foto", "app", "zurueck"] as const;
const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor|facebookexternalhit|whatsapp/i;

/**
 * Anonyme Nutzungszählung der Gäste-Seite (per sendBeacon): nur Event + Schritt + Zeit.
 * Keine IP, keine Kennung, nichts auf dem Gerät – damit sehen wir, wo Gäste aussteigen.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const { slug } = await props.params;
  let step = "";
  try {
    step = String(JSON.parse((await req.text()).slice(0, 200))?.s ?? "");
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!(STEPS as readonly string[]).includes(step)) return new NextResponse(null, { status: 400 });
  const supabase = createAdminClient();
  const { data: ev } = await supabase.from("vb_events").select("id").eq("slug", slug.toLowerCase()).maybeSingle();
  if (!ev) return new NextResponse(null, { status: 404 });
  await supabase.from("vb_event_stats").insert({ event_id: ev.id, step });
  return new NextResponse(null, { status: 204 });
}

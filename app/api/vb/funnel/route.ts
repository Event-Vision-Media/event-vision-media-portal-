import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VB_FUNNEL_STEPS, VB_SOURCES } from "@/lib/vb-funnel";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor|facebookexternalhit|whatsapp/i;
const HOSTS = /^https:\/\/(visionbooth\.de|portal\.fotobox-essen\.com)$|^http:\/\/localhost(:\d+)?$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} ._\-/]/gu, "").trim().slice(0, max) : "");

/** Anonymer VisionBooth-Trichter (per sendBeacon): nur Schritt, Quelle und Seite – keine IP, keine Kennung. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !HOSTS.test(origin)) return new NextResponse(null, { status: 403 });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  let body: { s?: unknown; q?: unknown; p?: unknown; k?: unknown };
  try {
    body = JSON.parse((await req.text()).slice(0, 500));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const step = String(body?.s ?? "");
  if (!(VB_FUNNEL_STEPS as readonly string[]).includes(step)) return new NextResponse(null, { status: 400 });
  const source = (VB_SOURCES as readonly string[]).includes(String(body?.q)) ? String(body.q) : "andere";
  await createAdminClient().from("funnel_events").insert({
    step,
    channel: source === "ads" ? "ads" : "sonst",
    campaign: source === "ads" ? `ads:${clean(body?.k, 50)}` : source,
    page: clean(body?.p, 80) || null,
  });
  return new NextResponse(null, { status: 204 });
}

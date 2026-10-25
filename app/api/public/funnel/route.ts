import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOrigins } from "@/lib/public-cors";
import { FUNNEL_STEPS } from "@/lib/funnel";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor/i;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[^\p{L}\p{N} ._\-/]/gu, "").trim().slice(0, max) : "");

/**
 * Anonyme Trichter-Zählung der Website. Kommt per sendBeacon als Text (kein Preflight),
 * nur von den eigenen Domains. Gespeichert werden ausschließlich Schritt, Kanal, Kampagne und Seite –
 * keine IP, keine Kennung, nichts auf dem Gerät.
 */
export async function POST(req: NextRequest) {
  if (!allowedOrigins().includes(req.headers.get("origin") ?? "")) return new NextResponse(null, { status: 403 });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });

  let body: any;
  try {
    body = JSON.parse((await req.text()).slice(0, 1000));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const step = String(body?.s ?? "");
  if (!(FUNNEL_STEPS as readonly string[]).includes(step)) return new NextResponse(null, { status: 400 });
  const channel = body?.c === "ads" ? "ads" : "sonst";

  await createAdminClient().from("funnel_events").insert({
    step,
    channel,
    campaign: channel === "ads" ? clean(body?.k, 60) || null : null,
    page: clean(body?.p, 80) || null,
  });
  return new NextResponse(null, { status: 204 });
}

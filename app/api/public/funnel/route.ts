import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOrigins } from "@/lib/public-cors";
import { FUNNEL_DETAIL_STEPS, FUNNEL_STEPS } from "@/lib/funnel";

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
  if (![...FUNNEL_STEPS, ...FUNNEL_DETAIL_STEPS].includes(step as never)) return new NextResponse(null, { status: 400 });
  const channel = body?.c === "ads" ? "ads" : "sonst";
  // Detail: Gerät (spiegel, fotobox, 360 …) bzw. Herkunftsseite (fotospiegel-mieten.html) – nichts Persönliches
  const detail = typeof body?.d === "string" ? body.d.replace(/[^a-z0-9._+\-]/gi, "").slice(0, 60) || null : null;

  const row: Record<string, string | null> = {
    step,
    channel,
    campaign: channel === "ads" ? clean(body?.k, 60) || null : null,
    page: clean(body?.p, 80) || null,
  };
  const sb = createAdminClient();
  const { error } = await sb.from("funnel_events").insert(detail ? { ...row, detail } : row);
  // Falls die Spalte „detail“ (SQL 0039) noch fehlt: Ereignis trotzdem zählen
  if (error && detail) await sb.from("funnel_events").insert(row);
  return new NextResponse(null, { status: 204 });
}

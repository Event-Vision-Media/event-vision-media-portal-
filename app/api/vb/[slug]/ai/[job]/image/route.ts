import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/**
 * Liefert das fertige KI-Bild über unsere eigene Adresse aus (gleiche Herkunft →
 * der Browser darf es in den Rahmen zeichnen). Gespeichert wird hier nichts.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string; job: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  const guestKey = (req.headers.get("x-vb-guest") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  if (!event || !guestKey || !/^[0-9a-f-]{36}$/.test(params.job)) return new NextResponse(null, { status: 404 });

  const { data: job } = await createAdminClient()
    .from("vb_ai_jobs")
    .select("result_url")
    .eq("id", params.job)
    .eq("event_id", event.id)
    .eq("guest_key", guestKey)
    .eq("status", "fertig")
    .maybeSingle();
  const url = job?.result_url;
  // nur Bilder von fal.ai durchreichen
  if (!url || !/^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\//.test(url)) return new NextResponse(null, { status: 404 });

  const img = await fetch(url, { cache: "no-store" });
  if (!img.ok || !img.body) return new NextResponse(null, { status: 502 });
  return new NextResponse(img.body, {
    headers: { "content-type": img.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=3600" },
  });
}

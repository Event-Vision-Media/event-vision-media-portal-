import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent } from "@/lib/visionbooth";
import { AI_STALE_MS, pollFal } from "@/lib/visionbooth-ai";

export const dynamic = "force-dynamic";

/** Status einer KI-Verwandlung (nur für den Gast, der sie gestartet hat). */
export async function GET(req: NextRequest, { params }: { params: { slug: string; job: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  const guestKey = (req.headers.get("x-vb-guest") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  if (!event || !guestKey || !/^[0-9a-f-]{36}$/.test(params.job)) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });

  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("vb_ai_jobs")
    .select("id, status, error, created_at, fal_status_url, fal_response_url, result_url")
    .eq("id", params.job)
    .eq("event_id", event.id)
    .eq("guest_key", guestKey)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  if (job.status === "fertig" || job.status === "fehler") return NextResponse.json({ status: job.status });

  const fail = async (msg: string) => {
    await supabase.from("vb_ai_jobs").update({ status: "fehler", error: msg.slice(0, 300), finished_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ status: "fehler" });
  };
  if (Date.now() - Date.parse(job.created_at) > AI_STALE_MS) return fail("Zeitüberschreitung");
  if (!job.fal_status_url || !job.fal_response_url) return NextResponse.json({ status: "laeuft" });

  try {
    const r = await pollFal(job.fal_status_url, job.fal_response_url);
    if ("error" in r) return fail(r.error);
    if (!r.done) return NextResponse.json({ status: "laeuft" });
    await supabase.from("vb_ai_jobs").update({ status: "fertig", result_url: r.url, finished_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ status: "fertig" });
  } catch (e) {
    console.error("VisionBooth-KI status:", e);
    return NextResponse.json({ status: "laeuft" });
  }
}

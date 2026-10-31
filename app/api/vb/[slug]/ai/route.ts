import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, vbClosedReason, VB_MAX_UPLOAD } from "@/lib/visionbooth";
import { AI_STALE_MS, stylePrompt, submitFal } from "@/lib/visionbooth-ai";

export const dynamic = "force-dynamic";

/**
 * KI-Verwandlung starten: Body = Original-Foto (JPEG, ohne Rahmen), ?style=<key>.
 * Prüft Event-Kontingent und Limit pro Gast, stellt den Auftrag in die fal-Warteschlange
 * und gibt die Auftrags-ID zurück; der Gast fragt danach den Status ab.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const closed = vbClosedReason(event);
  if (closed) return NextResponse.json({ error: closed }, { status: 403 });
  if (!event.ai_enabled) return NextResponse.json({ error: "KI-Stile sind bei diesem Event nicht aktiv." }, { status: 403 });

  const style = req.nextUrl.searchParams.get("style") ?? "";
  const prompt = event.ai_styles.includes(style) ? stylePrompt(style) : null;
  if (!prompt) return NextResponse.json({ error: "Unbekannter Stil" }, { status: 400 });

  const guestKey = (req.headers.get("x-vb-guest") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  if (!guestKey) return NextResponse.json({ error: "Bitte Cookies/Speicher im Browser erlauben." }, { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length < 1000 || buf.length > VB_MAX_UPLOAD || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return NextResponse.json({ error: "Ungültiges Foto" }, { status: 400 });
  }

  // Zählt: fertige Aufträge + laufende, die nicht hängen geblieben sind
  const supabase = createAdminClient();
  const fresh = new Date(Date.now() - AI_STALE_MS).toISOString();
  const used = (extra: (q: any) => any) =>
    extra(
      supabase
        .from("vb_ai_jobs")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .or(`status.eq.fertig,and(status.in.(wartet,laeuft),created_at.gt.${fresh})`)
    );
  const [{ count: eventCount }, { count: guestCount }, { count: running }] = await Promise.all([
    used((q) => q),
    used((q) => q.eq("guest_key", guestKey)),
    supabase
      .from("vb_ai_jobs")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("guest_key", guestKey)
      .in("status", ["wartet", "laeuft"])
      .gt("created_at", fresh),
  ]);
  if ((eventCount ?? 0) >= event.ai_limit) return NextResponse.json({ error: "Die KI-Bilder für dieses Event sind aufgebraucht – normale Fotos gehen weiterhin.", remaining: 0 }, { status: 429 });
  if ((guestCount ?? 0) >= event.ai_per_guest) return NextResponse.json({ error: "Du hast alle deine KI-Verwandlungen genutzt – lass auch den anderen Gästen etwas übrig 😉", remaining: 0 }, { status: 429 });
  if ((running ?? 0) > 0) return NextResponse.json({ error: "Deine letzte Verwandlung läuft noch – einen Moment." }, { status: 429 });

  const { data: job, error } = await supabase
    .from("vb_ai_jobs")
    .insert({ event_id: event.id, style, guest_key: guestKey, status: "wartet" })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: "Konnte nicht starten" }, { status: 500 });

  try {
    const { statusUrl, responseUrl } = await submitFal(style, `data:image/jpeg;base64,${buf.toString("base64")}`);
    await supabase.from("vb_ai_jobs").update({ status: "laeuft", fal_status_url: statusUrl, fal_response_url: responseUrl }).eq("id", job.id);
  } catch (e) {
    console.error("VisionBooth-KI start:", e);
    await supabase.from("vb_ai_jobs").update({ status: "fehler", error: String(e).slice(0, 300), finished_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ error: "Die KI ist gerade nicht erreichbar – bitte gleich nochmal versuchen." }, { status: 502 });
  }

  return NextResponse.json({ jobId: job.id, remaining: Math.max(0, event.ai_per_guest - (guestCount ?? 0) - 1) });
}

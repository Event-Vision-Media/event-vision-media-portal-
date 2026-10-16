import { NextResponse, type NextRequest } from "next/server";
import { isTestDelivery, verifySignature } from "@/lib/templatesbooth";
import { storeSubmission } from "@/lib/templatesbooth-server";

export const dynamic = "force-dynamic";

/**
 * Webhook von TemplatesBooth (Widget → Einstellungen → Connect → Webhook).
 * Events request.created / request.status_changed, Body = komplette Einsendung als JSON,
 * signiert mit X-TBW-Signature: sha256=<HMAC des rohen Bodys> (Secret: TEMPLATESBOOTH_WEBHOOK_SECRET).
 * Antwortet nur bei Fehlern auf unserer Seite mit 5xx – dann wiederholt TemplatesBooth.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TEMPLATESBOOTH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-tbw-signature"), secret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // „Send test“ aus TemplatesBooth: Verbindung ok, aber nichts speichern.
  if (isTestDelivery(payload)) {
    return NextResponse.json({ ok: true, test: true });
  }

  try {
    const result = await storeSubmission(payload, req.headers.get("x-tbw-event"));
    return NextResponse.json({ ok: true, matched: Boolean(result.bookingId) });
  } catch (e) {
    console.error("TemplatesBooth-Webhook:", e);
    return NextResponse.json({ ok: false, error: "store failed" }, { status: 500 });
  }
}

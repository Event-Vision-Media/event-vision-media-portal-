import { NextResponse, type NextRequest } from "next/server";
import { travelForAddress } from "@/lib/distance";
import { TRAVEL } from "@/lib/catalog";
import { corsHeaders } from "@/lib/public-cors";

export const dynamic = "force-dynamic";

/**
 * Fahrtkosten für das Anfrageformular der Website.
 * GET /api/public/distance?address=Gelsenkirchener Str. 181, 45309 Essen
 *
 * Die Adresse wird nicht gespeichert – nur Entfernung und Aufpreis zurückgegeben.
 */

// Drosselung pro IP (pro Server-Instanz), damit das kostenlose Kontingent reicht.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  if (!headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429, headers });

  const address = (req.nextUrl.searchParams.get("address") ?? "").trim().slice(0, 200);
  if (address.length < 5) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422, headers });

  const travel = await travelForAddress(address);
  return NextResponse.json({ ok: true, ...travel, includedKm: TRAVEL.includedKm }, { headers });
}

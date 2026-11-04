import { NextResponse } from "next/server";
import { loadVbEventByToken } from "@/lib/visionbooth";
import { csvResponseHeaders, vbLeadsCsv } from "@/lib/visionbooth-leads";

export const dynamic = "force-dynamic";

/** Kontakte als CSV für den Kunden (Berechtigung = Verwaltungs-Link). */
export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await loadVbEventByToken(params.token);
  if (!event) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  return new NextResponse(await vbLeadsCsv(event.id), { headers: csvResponseHeaders(event.slug) });
}

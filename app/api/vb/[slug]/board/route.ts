import { NextResponse, type NextRequest } from "next/server";
import { loadVbEvent } from "@/lib/visionbooth";
import { cleanGuestKey, vbBoard } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Bestenliste der Foto-Missionen (Gäste-App und Foto-Wand). */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || event.status === "entwurf") return NextResponse.json({ error: "nicht verfügbar" }, { status: 404 });
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 20);
  return NextResponse.json(await vbBoard(event, cleanGuestKey(req.headers.get("x-vb-guest")), limit));
}

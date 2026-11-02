import { NextResponse, type NextRequest } from "next/server";
import { deleteVbPhoto, loadVbEvent } from "@/lib/visionbooth";
import { cleanGuestKey } from "@/lib/visionbooth-board";

export const dynamic = "force-dynamic";

/** Gast löscht ein eigenes Foto (nur vom selben Gerät, mit dem es geteilt wurde). */
export async function DELETE(req: NextRequest, { params }: { params: { slug: string; id: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  const key = cleanGuestKey(req.headers.get("x-vb-guest"));
  if (!event || !key || !/^[0-9a-f-]{36}$/.test(params.id)) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  const ok = await deleteVbPhoto(event.id, params.id, key);
  if (!ok) return NextResponse.json({ error: "Dieses Foto kannst du nicht löschen." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

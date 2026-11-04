import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponseHeaders, vbLeadsCsv } from "@/lib/visionbooth-leads";

export const dynamic = "force-dynamic";

/** Kontakte eines VisionBooth-Events als CSV (Admin). */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { data: e } = await createAdminClient().from("vb_events").select("id, slug").eq("id", params.id).maybeSingle();
  if (!e) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  return new NextResponse(await vbLeadsCsv(e.id), { headers: csvResponseHeaders(e.slug) });
}

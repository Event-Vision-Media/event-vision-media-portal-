import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVOICE_BUCKET } from "@/lib/invoices";

export const dynamic = "force-dynamic";

/** Rechnungs-PDF einer VisionBooth-Online-Bestellung (Admin). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: o } = await supabase.from("vb_orders").select("invoice_path, invoice_number").eq("id", params.id).maybeSingle();
  if (!o?.invoice_path) return NextResponse.json({ error: "keine Rechnung" }, { status: 404 });
  const { data } = await supabase.storage.from(INVOICE_BUCKET).download(o.invoice_path);
  if (!data) return NextResponse.json({ error: "Datei fehlt" }, { status: 404 });
  return new NextResponse(data, {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="Rechnung-${o.invoice_number ?? params.id}.pdf"`, "cache-control": "no-store" },
  });
}

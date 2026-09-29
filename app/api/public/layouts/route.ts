import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Öffentliche Layout-Auswahl (Name, Kategorie, Premium, Vorschaubild) für die
 * Layout-Galerie der Website. Die Website lädt sie beim Bauen (build.py).
 */
export async function GET() {
  const { data, error } = await createAdminClient()
    .from("layouts")
    .select("name, category, is_premium, extra_price, preview_image_url, sort_order")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json(
    { ok: true, layouts: data ?? [] },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } }
  );
}

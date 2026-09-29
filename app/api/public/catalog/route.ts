import { NextResponse } from "next/server";
import catalogData from "@/lib/catalog-data.json";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Öffentlicher Preiskatalog (Pakete, Extras, Preise). Die Website liest ihn
 * beim Bauen (build.py), damit Preise nur an einer Stelle gepflegt werden.
 * Extras erhalten zusätzlich das im Admin hinterlegte Vorschaubild
 * (Zuordnung über dbExtraName), damit die Website dieselben Bilder zeigt.
 */
export async function GET() {
  const names = catalogData.extras.map((e) => ("dbExtraName" in e ? e.dbExtraName : null)).filter(Boolean) as string[];
  const images = new Map<string, string>();
  if (names.length) {
    const { data } = await createAdminClient().from("extras").select("name, preview_image_url").in("name", names);
    for (const row of data ?? []) if (row.preview_image_url) images.set(row.name, row.preview_image_url);
  }
  const extras = catalogData.extras.map((e) => {
    const image = "dbExtraName" in e && e.dbExtraName ? images.get(e.dbExtraName) : undefined;
    return image ? { ...e, portalImage: image } : e;
  });
  return NextResponse.json(
    { ...catalogData, extras },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } }
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { checkDeviceAvailability } from "@/lib/inquiry-server";
import { daysUntil, MAX_EVENT_DAYS, MIN_LEAD_DAYS, PRODUCT_LABELS, type DeviceKey } from "@/lib/catalog";
import { corsHeaders } from "@/lib/public-cors";

export const dynamic = "force-dynamic";

/**
 * Live-Verfügbarkeit für das Anfrageformular der Website.
 * GET /api/public/availability?date=2027-06-12&days=1&products=spiegel,audio
 *
 * Gibt nur frei/belegt je Gerät zurück – keine Buchungs- oder Kundendaten.
 */
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  if (!headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const date = params.get("date") ?? "";
  const days = Math.min(Math.max(1, Number(params.get("days")) || 1), MAX_EVENT_DAYS);
  const products = (params.get("products") ?? "")
    .split(",")
    .filter((p): p is DeviceKey => p in PRODUCT_LABELS);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || daysUntil(date) < 0 || products.length === 0) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422, headers });
  }

  const { available, busy, lastOne } = await checkDeviceAvailability(products, date, days);
  return NextResponse.json(
    {
      ok: true,
      available,
      busy: busy.map((d) => PRODUCT_LABELS[d]),
      lastOne: lastOne.map((d) => PRODUCT_LABELS[d]),
      shortNotice: daysUntil(date) < MIN_LEAD_DAYS,
      minLeadDays: MIN_LEAD_DAYS,
    },
    { headers: { ...headers, "Cache-Control": "no-store" } }
  );
}

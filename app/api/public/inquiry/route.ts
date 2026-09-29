import { NextResponse, type NextRequest } from "next/server";
import { parseImageDataUrl } from "@/lib/layout-drafts";
import { createBookingFromInquiry, type InquiryInput } from "@/lib/inquiry-server";
import { PACKAGES, PICKUP_OPTIONS, PRODUCT_LABELS, normalizeAccess } from "@/lib/catalog";
import { corsHeaders as cors } from "@/lib/public-cors";

export const dynamic = "force-dynamic";

/**
 * Öffentlicher Endpunkt für das Anfrageformular der Website.
 * POST /api/public/inquiry  (JSON)
 *
 * Erlaubte Website-Domains: siehe lib/public-cors.ts (ALLOWED_ORIGINS).
 */

// Einfache Drosselung pro IP (pro Server-Instanz) gegen Formular-Spam.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: NextRequest) {
  const headers = cors(req);
  if (!headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429, headers });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers });
  }

  // Honeypot: echte Nutzer lassen dieses unsichtbare Feld leer.
  if (str(body.website)) {
    return NextResponse.json({ ok: true, lifecycle: "anfrage" }, { headers });
  }

  const customerType = body.customerType === "business" ? "business" : "privat";
  const eventDate = str(body.eventDate, 10);
  const today = new Date().toISOString().slice(0, 10);
  const input: InquiryInput = {
    customerType,
    occasion: str(body.occasion, 80),
    packageIds: Array.isArray(body.packageIds) ? body.packageIds.map((x: unknown) => str(x, 40)).slice(0, 6) : [],
    extraIds: Array.isArray(body.extraIds) ? body.extraIds.map((x: unknown) => str(x, 40)).slice(0, 12) : [],
    days: Number(body.days) || 1,
    eventDate,
    location: str(body.location, 200),
    guestCount: Number.isFinite(Number(body.guestCount)) && Number(body.guestCount) > 0 ? Math.min(Math.round(Number(body.guestCount)), 100000) : null,
    duration: str(body.duration, 60) || null,
    company: customerType === "business" ? str(body.company, 120) || null : null,
    name: str(body.name, 120),
    email: str(body.email, 200).toLowerCase(),
    phone: str(body.phone, 40) || null,
    message: str(body.message, 3000) || null,
    access: null,
    pickup: PICKUP_OPTIONS.some((o) => o.id === body.pickup) ? body.pickup : null,
    layoutDraft: body.layoutDraft && typeof body.layoutDraft === "object" ? {
      label: str(body.layoutDraft.label, 200), title: str(body.layoutDraft.title, 60),
      subtitle: str(body.layoutDraft.subtitle, 60), small: str(body.layoutDraft.small, 80),
      logo: Boolean(body.layoutDraft.logo),
      settings: body.layoutDraft.settings && typeof body.layoutDraft.settings === "object"
        ? Object.fromEntries(Object.entries(body.layoutDraft.settings).slice(0, 12).map(([k, v]) => [str(k, 30), str(v, 60)]))
        : undefined,
    } : null,
    layoutFiles: body.layoutDraft && typeof body.layoutDraft === "object" ? {
      image: parseImageDataUrl(body.layoutDraft.image, 3_000_000),
      logo: parseImageDataUrl(body.layoutDraft.logoImage, 3_000_000),
      overlay: parseImageDataUrl(body.layoutDraft.overlayImage, 4_000_000),
    } : null,
  };

  const products = input.packageIds.map((id) => PACKAGES.find((p) => p.id === id)?.product).filter((p): p is NonNullable<typeof p> => Boolean(p));
  input.access = normalizeAccess(body.access, products);

  const missing: string[] = [];
  if (!input.name) missing.push("name");
  if (!EMAIL_RE.test(input.email)) missing.push("email");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate < today) missing.push("eventDate");
  if (!input.location) missing.push("location");
  if (!input.packageIds.length) missing.push("packageIds");
  if (customerType === "business" && !input.company) missing.push("company");
  if (missing.length) {
    return NextResponse.json({ ok: false, error: "invalid", fields: missing }, { status: 422, headers });
  }

  try {
    const result = await createBookingFromInquiry(input);
    return NextResponse.json(
      {
        ok: true,
        lifecycle: result.lifecycle,
        shortNotice: result.shortNotice,
        bookingCode: result.bookingCode,
        accessCode: result.accessCode,
        total: result.priced.total,
        isFromPrice: result.priced.isFromPrice,
        busy: result.busy.map((d) => PRODUCT_LABELS[d]),
        portalUrl: process.env.PORTAL_URL ?? null,
      },
      { headers }
    );
  } catch (err: any) {
    if (err?.message === "no_packages") {
      return NextResponse.json({ ok: false, error: "invalid", fields: ["packageIds"] }, { status: 422, headers });
    }
    console.error("[inquiry] Fehler beim Anlegen:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500, headers });
  }
}

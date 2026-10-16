import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Bestätigte Buchungen aus Google-Anzeigen als CSV für den Import in Google Ads
 * (Ziele → Conversions → Uploads). So lernt Google, welche Klicks wirklich buchen.
 */
export async function GET() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString(); // Google nimmt Klicks bis 90 Tage zurück an
  const { data } = await createAdminClient()
    .from("bookings")
    .select("booking_code, confirmed_at, total_price, inquiry_items")
    .eq("lifecycle", "bestaetigt")
    .gte("confirmed_at", since)
    .order("confirmed_at", { ascending: true });

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
    return p.replace("T", " ");
  };
  const rows = (data ?? [])
    .filter((b: any) => b.inquiry_items?.source?.gclid && b.confirmed_at)
    .map((b: any) => [b.inquiry_items.source.gclid, "Buchung bestätigt", fmt(b.confirmed_at), Number(b.total_price ?? 0).toFixed(2), "EUR"].join(","));
  const csv = ["Parameters:TimeZone=Europe/Berlin", "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency", ...rows].join("\n") + "\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="google-ads-buchungen-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

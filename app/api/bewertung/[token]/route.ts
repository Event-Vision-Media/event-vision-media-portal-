import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingFromReviewToken } from "@/lib/review-link";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|discord|skype|outlook|safelinks|proofpoint|mimecast|barracuda/i;

/** Bewertungs-Link aus Mail/WhatsApp: „geklickt“ merken und zu Google weiterleiten. */
export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const supabase = createAdminClient();
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "google_review_url").maybeSingle();
  const reviewUrl = (setting?.value as string | undefined) || null;
  if (!reviewUrl) return NextResponse.redirect(new URL("/", request.url));

  const id = bookingFromReviewToken(token);
  // Link-Vorschauen und Virenscanner in Mailprogrammen „klicken“ automatisch – die nicht mitzählen
  const ua = request.headers.get("user-agent") ?? "";
  if (id && !BOT.test(ua) && request.method === "GET") {
    const { data: b } = await supabase.from("bookings").select("google_review_clicked_at").eq("id", id).maybeSingle();
    if (b && !b.google_review_clicked_at) {
      await supabase.from("bookings").update({ google_review_clicked_at: new Date().toISOString() }).eq("id", id);
      await logActivity(id, "bewertung_geklickt", "⭐ Kunde hat den Bewertungs-Link geöffnet.");
    }
  }
  return NextResponse.redirect(reviewUrl);
}

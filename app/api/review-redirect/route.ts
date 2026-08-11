import { NextResponse } from "next/server";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const dashboardUrl = new URL("/dashboard", request.url);

  const supabase = createAdminClient();
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_review_url")
    .maybeSingle();

  const reviewUrl = setting?.value;
  if (!reviewUrl) {
    return NextResponse.redirect(dashboardUrl);
  }

  const booking = await getCurrentBooking();
  if (booking) {
    await supabase
      .from("bookings")
      .update({ google_review_clicked_at: new Date().toISOString() })
      .eq("id", booking.id);
  }

  return NextResponse.redirect(reviewUrl);
}

import { NextResponse } from "next/server";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const dashboardUrl = new URL("/dashboard", request.url);

  const booking = await getCurrentBooking();
  if (!booking || !booking.online_gallery_url) {
    return NextResponse.redirect(dashboardUrl);
  }

  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .update({ online_gallery_clicked_at: new Date().toISOString() })
    .eq("id", booking.id);

  return NextResponse.redirect(booking.online_gallery_url);
}

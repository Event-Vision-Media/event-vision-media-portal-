"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setBookingSessionCookie, clearBookingSessionCookie } from "@/lib/booking-session";

export interface LoginState {
  error?: string;
}

export async function loginWithBookingCode(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawCode = String(formData.get("booking_code") ?? "").trim();

  if (!rawCode) {
    return { error: "Bitte gib deinen Buchungscode ein." };
  }

  const normalizedCode = rawCode.toUpperCase();
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_code", normalizedCode)
    .maybeSingle();

  if (error || !booking) {
    return {
      error:
        "Diesen Buchungscode kennen wir leider nicht. Bitte überprüfe deine Eingabe oder kontaktiere uns.",
    };
  }

  setBookingSessionCookie(booking.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearBookingSessionCookie();
  redirect("/");
}

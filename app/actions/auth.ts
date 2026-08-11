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
    return { error: "Bitte gib deinen Buchungscode oder dein Passwort ein." };
  }

  const supabase = createAdminClient();
  const normalizedCode = rawCode.toUpperCase();

  const { data: byCode } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_code", normalizedCode)
    .maybeSingle();

  let booking = byCode;

  if (!booking) {
    const { data: byPassword } = await supabase
      .from("bookings")
      .select("id")
      .eq("custom_login_code", rawCode)
      .maybeSingle();
    booking = byPassword;
  }

  if (!booking) {
    return {
      error:
        "Diesen Buchungscode oder dieses Passwort kennen wir leider nicht. Bitte überprüfe deine Eingabe oder kontaktiere uns.",
    };
  }

  setBookingSessionCookie(booking.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearBookingSessionCookie();
  redirect("/");
}

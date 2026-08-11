import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Booking } from "@/lib/types";

const COOKIE_NAME = "fb_booking_id";

export function setBookingSessionCookie(bookingId: string) {
  cookies().set(COOKIE_NAME, bookingId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Gültig für die ungefähre Dauer bis zu einem Jahr nach der Buchung.
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearBookingSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/**
 * Liest die aktuelle Buchung anhand der Session-Cookie.
 * Gibt null zurück, wenn keine gültige Session/Buchung existiert.
 */
export async function getCurrentBooking(): Promise<Booking | null> {
  const bookingId = cookies().get(COOKIE_NAME)?.value;
  if (!bookingId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Booking;
}

/**
 * Wie getCurrentBooking, leitet aber auf die Login-Seite um, falls keine
 * gültige Session vorhanden ist. Für den Einsatz in geschützten Seiten.
 */
export async function requireBooking(): Promise<Booking> {
  const booking = await getCurrentBooking();
  if (!booking) {
    redirect("/");
  }
  return booking;
}

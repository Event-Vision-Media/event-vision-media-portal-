"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setBookingSessionCookie, clearBookingSessionCookie } from "@/lib/booking-session";
import { PORTAL_LIFECYCLES } from "@/lib/types";

export interface LoginState {
  error?: string;
}

// Schutz gegen das Durchprobieren von Codes: max. 10 Fehlversuche je IP
// innerhalb von 15 Minuten (pro Server-Instanz).
const failedLogins = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

function recentFailures(ip: string): number[] {
  const now = Date.now();
  const list = (failedLogins.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  failedLogins.set(ip, list);
  return list;
}

/** Login per Buchungscode (FB-…) nur solange die Übergangsphase läuft. */
function legacyBookingCodeLoginEnabled(): boolean {
  return process.env.LEGACY_BOOKING_CODE_LOGIN !== "false";
}

export async function loginWithBookingCode(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawCode = String(formData.get("booking_code") ?? "").trim();

  if (!rawCode) {
    return { error: "Bitte gib deinen Zugangscode oder dein Passwort ein." };
  }

  const ip = headers().get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (recentFailures(ip).length >= MAX_FAILURES) {
    return { error: "Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann erneut." };
  }

  const supabase = createAdminClient();
  const upperCode = rawCode.toUpperCase();

  // 1. Zufälliger Zugangscode (EV-XXXX-XXXX), unabhängig von Groß-/Kleinschreibung
  const { data: byAccessCode } = await supabase
    .from("bookings")
    .select("id, lifecycle")
    .eq("access_code", upperCode)
    .maybeSingle();
  let booking = byAccessCode;

  // 2. Individuelles Passwort (vom Admin vergeben)
  if (!booking) {
    const { data: byPassword } = await supabase
      .from("bookings")
      .select("id, lifecycle")
      .eq("custom_login_code", rawCode)
      .maybeSingle();
    booking = byPassword;
  }

  // 3. Übergangsweise: fortlaufender Buchungscode (FB-…)
  if (!booking && legacyBookingCodeLoginEnabled()) {
    const { data: byCode } = await supabase
      .from("bookings")
      .select("id, lifecycle")
      .eq("booking_code", upperCode)
      .maybeSingle();
    booking = byCode;
  }

  if (booking && booking.lifecycle && !PORTAL_LIFECYCLES.includes(booking.lifecycle)) {
    // Noch nicht bestätigt: freundlicher Hinweis statt "unbekannter Code"
    if (booking.lifecycle === "reserviert" || booking.lifecycle === "anfrage") {
      return {
        error:
          "Deine Buchung wird gerade von uns geprüft. Den Zugang zum Kundenportal bekommst du mit der Auftragsbestätigung per E-Mail – in der Regel innerhalb von 24 Stunden.",
      };
    }
    booking = null;
  }

  if (!booking) {
    recentFailures(ip).push(Date.now());
    return {
      error:
        "Diesen Zugangscode oder dieses Passwort kennen wir leider nicht. Bitte überprüfe deine Eingabe oder kontaktiere uns.",
    };
  }

  failedLogins.delete(ip);
  setBookingSessionCookie(booking.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearBookingSessionCookie();
  redirect("/");
}

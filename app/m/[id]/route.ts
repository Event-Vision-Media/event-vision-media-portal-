import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { PERSONAL_MAIL, PERSONAL_MAIL_CLICK } from "@/lib/personal-mail-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Portal-Link aus einer persönlichen Nachricht: merkt sich den ersten Klick
 * (für „Link geöffnet am …“ im Admin) und leitet zur Portal-Anmeldung weiter.
 * Kein Zählpixel, keine Daten an Dritte – nur ein Eintrag im eigenen Protokoll.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = new URL("/", req.url);
  if (!UUID.test(id)) return NextResponse.redirect(target, 302);
  try {
    const supabase = createAdminClient();
    const { data: mail } = await supabase
      .from("activity_log")
      .select("id, booking_id, message")
      .eq("id", id)
      .eq("event_type", PERSONAL_MAIL)
      .maybeSingle();
    if (mail?.booking_id) {
      const { count } = await supabase
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("event_type", PERSONAL_MAIL_CLICK)
        .eq("message", id);
      if (!count) {
        await supabase.from("activity_log").insert({ booking_id: mail.booking_id, event_type: PERSONAL_MAIL_CLICK, message: id });
        const subject = /„(.*)“/.exec(mail.message)?.[1];
        await logActivity(mail.booking_id, "mail_geoeffnet", `👆 Kunde hat den Link in deiner Nachricht${subject ? ` „${subject}“` : ""} geöffnet`);
      }
    }
  } catch {
    // Weiterleitung ist wichtiger als das Protokoll
  }
  return NextResponse.redirect(target, 302);
}

/** Link-Vorabprüfungen (z. B. Virenscanner) senden oft HEAD – nicht als Klick zählen. */
export async function HEAD(req: NextRequest) {
  return NextResponse.redirect(new URL("/", req.url), 302);
}

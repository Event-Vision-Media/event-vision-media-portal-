import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { isAdminAuthenticated } from "@/lib/require-admin";

const GREETINGS_BUCKET = "audio-guestbook-greetings";
const RECORDINGS_BUCKET = "audio-guestbook-recordings";
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Leitet auf eine kurzlebige, signierte Download-URL (mit dem echten
 * Original-Dateinamen statt des UUID-Pfads) für eine einzelne Begrüßungs-
 * nachricht oder Gästeaufnahme weiter. Zugriff nur für den eingeloggten
 * Kunden der jeweiligen Buchung oder für Admins.
 */
export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind");
  const supabase = createAdminClient();
  const [guestBooking, isAdmin] = await Promise.all([
    getCurrentBooking(),
    isAdminAuthenticated(),
  ]);

  if (kind === "greeting") {
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId fehlt." }, { status: 400 });
    }
    if (guestBooking?.id !== bookingId && !isAdmin) {
      return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
    }

    const { data: greeting } = await supabase
      .from("audio_guestbook_greetings")
      .select("storage_path, file_name")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!greeting) {
      return NextResponse.json({ error: "Keine Begrüßungsnachricht vorhanden." }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from(GREETINGS_BUCKET)
      .createSignedUrl(greeting.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: greeting.file_name,
      });

    if (error || !data) {
      return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    }
    return NextResponse.redirect(data.signedUrl);
  }

  if (kind === "recording") {
    const recordingId = request.nextUrl.searchParams.get("recordingId");
    if (!recordingId) {
      return NextResponse.json({ error: "recordingId fehlt." }, { status: 400 });
    }

    const { data: recording } = await supabase
      .from("audio_guestbook_recordings")
      .select("booking_id, storage_path, file_name")
      .eq("id", recordingId)
      .maybeSingle();

    if (!recording) {
      return NextResponse.json({ error: "Aufnahme nicht gefunden." }, { status: 404 });
    }
    if (guestBooking?.id !== recording.booking_id && !isAdmin) {
      return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(recording.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: recording.file_name,
      });

    if (error || !data) {
      return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
    }
    return NextResponse.redirect(data.signedUrl);
  }

  return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
}

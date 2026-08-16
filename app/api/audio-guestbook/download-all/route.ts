import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { isAdminAuthenticated } from "@/lib/require-admin";

const RECORDINGS_BUCKET = "audio-guestbook-recordings";

/**
 * Streamt alle Gästeaufnahmen einer Buchung als ZIP. Zugriff nur für den
 * eingeloggten Kunden der jeweiligen Buchung oder für Admins - Aufnahmen
 * liegen in einem privaten Storage-Bucket und sind sonst nicht erreichbar.
 */
export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId fehlt." }, { status: 400 });
  }

  const [guestBooking, isAdmin] = await Promise.all([
    getCurrentBooking(),
    isAdminAuthenticated(),
  ]);
  const isGuestOwner = guestBooking?.id === bookingId;

  if (!isGuestOwner && !isAdmin) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const [{ data: booking }, { data: recordings }] = await Promise.all([
    supabase.from("bookings").select("booking_code").eq("id", bookingId).maybeSingle(),
    supabase
      .from("audio_guestbook_recordings")
      .select("storage_path, file_name")
      .eq("booking_id", bookingId)
      .order("uploaded_at", { ascending: true }),
  ]);

  if (!recordings || recordings.length === 0) {
    return NextResponse.json({ error: "Keine Aufnahmen vorhanden." }, { status: 404 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const recording of recordings) {
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .download(recording.storage_path);
    if (error || !data) continue;

    let name = recording.file_name || "Aufnahme.mp3";
    if (usedNames.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot === -1 ? name : name.slice(0, dot);
      const ext = dot === -1 ? "" : name.slice(dot);
      const suffix = recording.storage_path.replace(/[^a-zA-Z0-9]/g, "").slice(-6);
      name = `${base}-${suffix}${ext}`;
    }
    usedNames.add(name);

    zip.file(name, await data.arrayBuffer());
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Audiogaestebuch-${booking?.booking_code ?? bookingId}.zip"`,
    },
  });
}

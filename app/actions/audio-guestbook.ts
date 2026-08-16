"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { logActivity } from "@/lib/activity-log";
import { AUDIO_MAX_FILE_SIZE_BYTES, AUDIO_UPLOAD_EXTENSIONS } from "@/lib/types";

const GREETINGS_BUCKET = "audio-guestbook-greetings";

export interface ActionResult {
  success?: boolean;
  error?: string;
}

function getFileExtension(fileName: string): string {
  return (fileName.split(".").pop() || "").toLowerCase();
}

export interface UploadTarget {
  path: string;
  token: string;
}

export interface UploadTargetResult extends ActionResult {
  target?: UploadTarget;
}

/**
 * Erzeugt eine kurzlebige, signierte Upload-URL für die Begrüßungsnachricht.
 * Die eigentlichen Datei-Bytes gehen danach direkt vom Browser zu Supabase
 * Storage (nicht über diese Server Action), da Server Actions ein
 * Body-Size-Limit haben.
 */
export async function createGreetingUploadTarget(
  fileName: string,
  fileSize: number
): Promise<UploadTargetResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const ext = getFileExtension(fileName);
  if (!AUDIO_UPLOAD_EXTENSIONS.includes(ext)) {
    return { error: "Bitte lade eine MP3-, WAV- oder M4A-Datei hoch." };
  }
  if (fileSize <= 0 || fileSize > AUDIO_MAX_FILE_SIZE_BYTES) {
    return { error: "Die Datei ist zu groß (maximal 100 MB)." };
  }

  const path = `${booking.id}/${randomUUID()}.${ext}`;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(GREETINGS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { error: "Upload konnte nicht vorbereitet werden. Bitte versuche es erneut." };
  }

  return { success: true, target: { path: data.path, token: data.token } };
}

/**
 * Wird vom Client aufgerufen, nachdem der direkte Upload zu Storage
 * erfolgreich war: speichert die Metadaten und entfernt eine zuvor
 * hochgeladene Begrüßungsnachricht (Austausch).
 */
export async function confirmGreetingUpload(
  path: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }
  if (!path.startsWith(`${booking.id}/`)) {
    return { error: "Ungültiger Upload." };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("audio_guestbook_greetings")
    .select("storage_path")
    .eq("booking_id", booking.id)
    .maybeSingle();

  const { error } = await supabase.from("audio_guestbook_greetings").upsert(
    {
      booking_id: booking.id,
      storage_path: path,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    return { error: "Konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  if (existing?.storage_path && existing.storage_path !== path) {
    await supabase.storage.from(GREETINGS_BUCKET).remove([existing.storage_path]);
  }

  await logActivity(
    booking.id,
    "audio_greeting_uploaded",
    `${booking.couple_names} hat eine Begrüßungsnachricht fürs Audiogästebuch hochgeladen.`
  );

  revalidatePath("/dashboard/audiogaestebuch");
  revalidatePath("/dashboard");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

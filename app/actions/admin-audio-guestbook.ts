"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { AUDIO_MAX_FILE_SIZE_BYTES, AUDIO_UPLOAD_EXTENSIONS } from "@/lib/types";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

const RECORDINGS_BUCKET = "audio-guestbook-recordings";

function getFileExtension(fileName: string): string {
  return (fileName.split(".").pop() || "").toLowerCase();
}

function revalidateAudioPaths(bookingId: string) {
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/audiogaestebuch");
  revalidatePath("/dashboard");
}

export interface RecordingUploadTarget {
  fileName: string;
  path: string;
  token: string;
}

export interface RecordingUploadTargetsResult extends AdminActionResult {
  targets?: RecordingUploadTarget[];
}

/**
 * Erzeugt für eine Reihe von Dateien in einem Rutsch signierte Upload-URLs,
 * damit der Admin z.B. 100 Gästeaufnahmen gleichzeitig auswählen kann, ohne
 * dass die Datei-Bytes selbst über eine Server Action laufen (Body-Size-
 * Limit) - Upload geht direkt vom Browser zu Supabase Storage.
 */
export async function createRecordingUploadTargets(
  bookingId: string,
  files: { name: string; size: number }[]
): Promise<RecordingUploadTargetsResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }
  if (files.length === 0) {
    return { error: "Keine Dateien ausgewählt." };
  }

  for (const file of files) {
    const ext = getFileExtension(file.name);
    if (!AUDIO_UPLOAD_EXTENSIONS.includes(ext)) {
      return { error: `"${file.name}" ist kein unterstütztes Audioformat (MP3, WAV, M4A).` };
    }
    if (file.size <= 0 || file.size > AUDIO_MAX_FILE_SIZE_BYTES) {
      return { error: `"${file.name}" ist zu groß (maximal 100 MB je Datei).` };
    }
  }

  const supabase = createAdminClient();
  const targets: RecordingUploadTarget[] = [];

  for (const file of files) {
    const ext = getFileExtension(file.name);
    const path = `${bookingId}/${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return { error: `Upload für "${file.name}" konnte nicht vorbereitet werden.` };
    }
    targets.push({ fileName: file.name, path: data.path, token: data.token });
  }

  return { success: true, targets };
}

/**
 * Speichert die Metadaten aller erfolgreich hochgeladenen Aufnahmen in
 * einem einzigen Insert, statt für jede Datei einen eigenen Request zu
 * machen.
 */
export async function confirmRecordingUploads(
  bookingId: string,
  uploaded: { path: string; fileName: string; fileSize: number; mimeType: string }[]
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }
  if (uploaded.length === 0) {
    return { error: "Keine Dateien zum Speichern." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("audio_guestbook_recordings").insert(
    uploaded.map((file) => ({
      booking_id: bookingId,
      storage_path: file.path,
      file_name: file.fileName,
      file_size: file.fileSize,
      mime_type: file.mimeType,
    }))
  );

  if (error) {
    return { error: "Aufnahmen konnten nicht gespeichert werden." };
  }

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("couple_names")
    .eq("id", bookingId)
    .maybeSingle();

  await logActivity(
    bookingId,
    "audio_recordings_uploaded",
    `${uploaded.length} Gästeaufnahme(n) für ${bookingData?.couple_names ?? "die Buchung"} bereitgestellt.`
  );

  revalidateAudioPaths(bookingId);
  return { success: true };
}

export async function deleteRecording(
  recordingId: string,
  bookingId: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { data: recording } = await supabase
    .from("audio_guestbook_recordings")
    .select("storage_path")
    .eq("id", recordingId)
    .maybeSingle();

  const { error } = await supabase.from("audio_guestbook_recordings").delete().eq("id", recordingId);
  if (error) {
    return { error: "Aufnahme konnte nicht gelöscht werden." };
  }

  if (recording?.storage_path) {
    await supabase.storage.from(RECORDINGS_BUCKET).remove([recording.storage_path]);
  }

  revalidateAudioPaths(bookingId);
  return { success: true };
}

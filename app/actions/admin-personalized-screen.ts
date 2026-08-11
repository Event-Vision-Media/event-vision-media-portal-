"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

function revalidateProofPaths() {
  revalidatePath(`/admin/startbildschirm-freigaben`);
  revalidatePath(`/admin/dashboard`);
  revalidatePath(`/dashboard/startbildschirm`);
  revalidatePath(`/dashboard`);
}

export async function uploadPersonalizedScreenProof(
  bookingId: string,
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "Bitte eine Bilddatei auswählen." };
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("personalized_screen_proofs")
    .select("version")
    .eq("booking_id", bookingId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${bookingId}/${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("personalized-screen-proofs")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: "Datei-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("personalized-screen-proofs")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("personalized_screen_proofs").insert({
    booking_id: bookingId,
    version: nextVersion,
    file_url: publicUrlData.publicUrl,
    admin_notes: adminNotes,
    status: "in_pruefung",
  });

  if (error) {
    return { error: "Entwurf konnte nicht gespeichert werden." };
  }

  revalidateProofPaths();
  return { success: true };
}

export async function updatePersonalizedScreenAdminResponse(
  proofId: string,
  response: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const trimmed = response.trim();
  if (!trimmed) {
    return { error: "Bitte eine Antwort eingeben." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("personalized_screen_proofs")
    .update({ admin_response: trimmed, admin_response_at: new Date().toISOString() })
    .eq("id", proofId);

  if (error) {
    return { error: "Antwort konnte nicht gespeichert werden." };
  }

  revalidateProofPaths();
  return { success: true };
}

export async function deletePersonalizedScreenProof(proofId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("personalized_screen_proofs").delete().eq("id", proofId);

  if (error) {
    return { error: "Entwurf konnte nicht gelöscht werden." };
  }

  revalidateProofPaths();
  return { success: true };
}

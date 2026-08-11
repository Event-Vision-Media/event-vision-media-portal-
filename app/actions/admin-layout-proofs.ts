"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

function revalidateProofPaths(bookingId: string) {
  revalidatePath(`/admin/layout-freigaben`);
  revalidatePath(`/admin/dashboard`);
  revalidatePath(`/dashboard/layout-freigabe`);
  revalidatePath(`/dashboard`);
}

export async function uploadLayoutProof(
  bookingId: string,
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const layoutName = String(formData.get("layout_name") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;
  const file = formData.get("file") as File | null;

  if (!layoutName) {
    return { error: "Bitte einen Layoutnamen angeben." };
  }
  if (!file || file.size === 0) {
    return { error: "Bitte eine Datei auswählen." };
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("layout_proofs")
    .select("version")
    .eq("booking_id", bookingId)
    .eq("layout_name", layoutName)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const isPdf = file.type === "application/pdf" || fileExt === "pdf";
  const filePath = `${bookingId}/${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("layout-proofs")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: "Datei-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("layout-proofs")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("layout_proofs").insert({
    booking_id: bookingId,
    layout_name: layoutName,
    version: nextVersion,
    file_url: publicUrlData.publicUrl,
    file_type: isPdf ? "pdf" : "image",
    admin_notes: adminNotes,
    status: "in_pruefung",
  });

  if (error) {
    return { error: "Layout konnte nicht gespeichert werden." };
  }

  revalidateProofPaths(bookingId);
  return { success: true };
}

export async function updateAdminResponse(
  proofId: string,
  bookingId: string,
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
    .from("layout_proofs")
    .update({ admin_response: trimmed, admin_response_at: new Date().toISOString() })
    .eq("id", proofId);

  if (error) {
    return { error: "Antwort konnte nicht gespeichert werden." };
  }

  revalidateProofPaths(bookingId);
  return { success: true };
}

export async function deleteLayoutProof(
  proofId: string,
  bookingId: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("layout_proofs").delete().eq("id", proofId);

  if (error) {
    return { error: "Layout konnte nicht gelöscht werden." };
  }

  revalidateProofPaths(bookingId);
  return { success: true };
}

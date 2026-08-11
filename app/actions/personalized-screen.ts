"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { logActivity } from "@/lib/activity-log";
import type { ActionResult } from "@/app/actions/booking";

export type { ActionResult };

function revalidateStartscreenPaths() {
  revalidatePath("/dashboard/startbildschirm");
  revalidatePath("/dashboard");
  revalidatePath("/admin/startbildschirm-freigaben");
  revalidatePath("/admin/dashboard");
}

export async function submitPersonalizationDetails(formData: FormData): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const name = String(formData.get("personalization_name") ?? "").trim();
  const date = String(formData.get("personalization_date") ?? "").trim();
  const wishText = String(formData.get("wish_text") ?? "").trim();
  const photoFile = formData.get("photo") as File | null;

  if (!name || !date) {
    return { error: "Bitte gebt mindestens Name und Datum an." };
  }

  const supabase = createAdminClient();
  let photoUrl: string | undefined;

  if (photoFile && photoFile.size > 0) {
    const fileExt = photoFile.name.split(".").pop() || "jpg";
    const filePath = `${booking.id}/${randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("personalized-screen-uploads")
      .upload(filePath, photoFile, { contentType: photoFile.type });

    if (uploadError) {
      return { error: "Bild-Upload fehlgeschlagen. Bitte versuche es erneut." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("personalized-screen-uploads")
      .getPublicUrl(filePath);
    photoUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("personalized_screen_requests").upsert(
    {
      booking_id: booking.id,
      personalization_name: name,
      personalization_date: date,
      wish_text: wishText || null,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    return { error: "Angaben konnten nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "personalization_details_submitted",
    `${booking.couple_names} hat Angaben für den personalisierten Startbildschirm eingereicht.`
  );

  revalidateStartscreenPaths();
  return { success: true };
}

export async function approvePersonalizedScreenProof(proofId: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { data: proof } = await supabase
    .from("personalized_screen_proofs")
    .select("id, booking_id")
    .eq("id", proofId)
    .maybeSingle();

  if (!proof || proof.booking_id !== booking.id) {
    return { error: "Entwurf nicht gefunden." };
  }

  const { error } = await supabase
    .from("personalized_screen_proofs")
    .update({
      status: "freigegeben",
      approved_at: new Date().toISOString(),
      customer_feedback: null,
      customer_feedback_at: null,
      admin_response: null,
      admin_response_at: null,
    })
    .eq("id", proofId);

  if (error) {
    return { error: "Konnte nicht freigegeben werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "personalized_screen_proof_approved",
    `${booking.couple_names} hat den Startbildschirm-Entwurf freigegeben.`
  );

  revalidateStartscreenPaths();
  return { success: true };
}

export async function requestPersonalizedScreenChanges(
  proofId: string,
  feedback: string
): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const trimmed = feedback.trim();
  if (!trimmed) {
    return { error: "Bitte beschreibe kurz, was geändert werden soll." };
  }

  const supabase = createAdminClient();
  const { data: proof } = await supabase
    .from("personalized_screen_proofs")
    .select("id, booking_id")
    .eq("id", proofId)
    .maybeSingle();

  if (!proof || proof.booking_id !== booking.id) {
    return { error: "Entwurf nicht gefunden." };
  }

  const { error } = await supabase
    .from("personalized_screen_proofs")
    .update({
      status: "aenderungen_erforderlich",
      customer_feedback: trimmed,
      customer_feedback_at: new Date().toISOString(),
      admin_response: null,
      admin_response_at: null,
      approved_at: null,
    })
    .eq("id", proofId);

  if (error) {
    return { error: "Konnte nicht übermittelt werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "personalized_screen_proof_changes_requested",
    `${booking.couple_names} hat Änderungen am Startbildschirm-Entwurf angefordert.`
  );

  revalidateStartscreenPaths();
  return { success: true };
}

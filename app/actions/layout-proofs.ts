"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { logActivity } from "@/lib/activity-log";
import type { ActionResult } from "@/app/actions/booking";

export type { ActionResult };

export async function approveLayoutProof(proofId: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { data: proof } = await supabase
    .from("layout_proofs")
    .select("id, booking_id, layout_name")
    .eq("id", proofId)
    .maybeSingle();

  if (!proof || proof.booking_id !== booking.id) {
    return { error: "Layout nicht gefunden." };
  }

  const { error } = await supabase
    .from("layout_proofs")
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
    "layout_proof_approved",
    `${booking.couple_names} hat das Layout "${proof.layout_name}" freigegeben.`
  );

  revalidatePath("/dashboard/layout-freigabe");
  revalidatePath("/dashboard");
  revalidatePath("/admin/layout-freigaben");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function requestLayoutChanges(
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
    .from("layout_proofs")
    .select("id, booking_id, layout_name")
    .eq("id", proofId)
    .maybeSingle();

  if (!proof || proof.booking_id !== booking.id) {
    return { error: "Layout nicht gefunden." };
  }

  const { error } = await supabase
    .from("layout_proofs")
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
    "layout_proof_changes_requested",
    `${booking.couple_names} hat Änderungen am Layout "${proof.layout_name}" angefordert.`
  );

  revalidatePath("/dashboard/layout-freigabe");
  revalidatePath("/dashboard");
  revalidatePath("/admin/layout-freigaben");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { applySubmissionToBooking } from "@/lib/templatesbooth-server";
import type { AdminActionResult } from "@/app/actions/admin";

/** Ordnet eine nicht automatisch erkannte TemplatesBooth-Einsendung einer Buchung zu. */
export async function assignTemplateSubmission(submissionId: string, bookingId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  if (!bookingId) return { error: "Bitte eine Buchung auswählen." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("template_submissions")
    .update({ booking_id: bookingId, matched_by: "admin" })
    .eq("id", submissionId)
    .select("design_name")
    .single();
  if (error || !data) return { error: "Zuordnung fehlgeschlagen." };

  await applySubmissionToBooking(bookingId, data.design_name);
  return { success: true };
}

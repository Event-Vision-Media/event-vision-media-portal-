"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

function revalidateAvailabilityPaths() {
  revalidatePath("/admin/verfuegbarkeit");
  revalidatePath("/admin/extras");
  revalidatePath("/dashboard/event-highlights");
}

export async function createAvailabilityBlock(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const target = String(formData.get("target") ?? "");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim() || startDate;
  const blockedQuantity = Number(formData.get("blocked_quantity") ?? 1);
  const note = String(formData.get("note") ?? "").trim() || null;

  const [type, id] = target.split(":");
  if ((type !== "extra" && type !== "variant") || !id) {
    return { error: "Bitte ein Produkt auswählen." };
  }
  if (!startDate) {
    return { error: "Bitte ein Datum angeben." };
  }
  if (endDate < startDate) {
    return { error: "Das Enddatum darf nicht vor dem Startdatum liegen." };
  }
  if (!Number.isFinite(blockedQuantity) || blockedQuantity <= 0) {
    return { error: "Bitte eine gültige Menge angeben." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("availability_blocks").insert({
    extra_id: type === "extra" ? id : null,
    variant_id: type === "variant" ? id : null,
    start_date: startDate,
    end_date: endDate,
    blocked_quantity: blockedQuantity,
    note,
  });

  if (error) {
    return { error: "Blockierung konnte nicht gespeichert werden." };
  }

  revalidateAvailabilityPaths();
  return { success: true };
}

export async function deleteAvailabilityBlock(blockId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("availability_blocks").delete().eq("id", blockId);

  if (error) {
    return { error: "Blockierung konnte nicht entfernt werden." };
  }

  revalidateAvailabilityPaths();
  return { success: true };
}

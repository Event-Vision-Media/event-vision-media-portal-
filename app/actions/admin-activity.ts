"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

export async function markActivityRead(entryId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("activity_log")
    .update({ read_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) {
    return { error: "Konnte nicht als gelesen markiert werden." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function markAllActivityRead(): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("activity_log")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    return { error: "Konnte nicht als gelesen markiert werden." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

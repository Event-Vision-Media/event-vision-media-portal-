"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

/** VisionBooth-Bestellungen gelten bis zu diesem Zeitpunkt als gesehen (Cookie im Admin-Browser). */
const VB_SEEN_COOKIE = "vb_orders_seen";

async function markVbSeenNow() {
  (await cookies()).set(VB_SEEN_COOKIE, new Date().toISOString(), { path: "/admin", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
}

/** Online-Bestellliste geöffnet → alle VisionBooth-Buchungen als gesehen markieren. */
export async function markVbOrdersSeen(): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  await markVbSeenNow();
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function markActivityRead(entryId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }
  if (entryId.startsWith("vb:")) {
    await markVbSeenNow();
    revalidatePath("/admin/dashboard");
    return { success: true };
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
  await markVbSeenNow();

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

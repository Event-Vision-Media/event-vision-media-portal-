"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";

/** Ansprache (Du/Sie/automatisch) und Anrede (Frau/Herr/keine) einer Buchung festlegen. */
export async function setAddressing(bookingId: string, form: string, salutation: string, name?: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const address_form = form === "du" || form === "sie" ? form : null;
  const sal = salutation === "frau" || salutation === "herr" ? salutation : null;
  const patch: Record<string, string | null> = { address_form, salutation: sal };
  const cleanName = name?.replace(/\s+/g, " ").trim().slice(0, 120);
  if (name !== undefined) {
    if (!cleanName) return { error: "Bitte einen Namen eingeben." };
    patch.customer_name = cleanName;
  }
  const { error } = await createAdminClient().from("bookings").update(patch).eq("id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden – ist die Datenbank-Erweiterung (0034_ansprache) eingespielt?" };
  await logActivity(
    bookingId,
    "ansprache_geaendert",
    `Ansprache: ${address_form === "du" ? "Du" : address_form === "sie" ? "Sie" : "automatisch"}${sal ? ` · Anrede ${sal === "frau" ? "Frau" : "Herr"}` : ""}${cleanName ? ` · Name: ${cleanName}` : ""}`
  );
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

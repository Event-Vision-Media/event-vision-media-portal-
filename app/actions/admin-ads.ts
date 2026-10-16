"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { getAdSpend } from "@/lib/ads";

/** Werbekosten eines Monats speichern (leer = löschen). */
export async function saveAdSpend(month: string, amount: string): Promise<{ error?: string; success?: boolean }> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Ungültiger Monat." };
  const raw = amount.trim().replace(",", ".");
  const value = raw === "" ? null : Math.round(Number(raw) * 100) / 100;
  if (value != null && (!Number.isFinite(value) || value < 0 || value > 100000)) return { error: "Bitte einen gültigen Betrag eingeben." };
  const spend = await getAdSpend();
  if (value == null) delete spend[month];
  else spend[month] = value;
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: "ad_spend", value: JSON.stringify(spend), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { error: "Konnte nicht gespeichert werden." };
  revalidatePath("/admin/statistik");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

// Eigene Termine (außerhalb der Buchungen): erscheinen im Kalender, im Kalender-Abo
// und im Wochenplan. Optional wird ein Extra für den Zeitraum gesperrt.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function revalidate() {
  revalidatePath("/admin/kalender");
  revalidatePath("/admin/kalender/termine");
  revalidatePath("/admin/verfuegbarkeit");
  revalidatePath("/dashboard/event-highlights");
}

export async function createAppointment(_prev: AdminActionResult, formData: FormData): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim() || null;
  const returnDate = String(formData.get("return_date") ?? "").trim() || null;
  const returnTime = String(formData.get("return_time") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const extraId = String(formData.get("block_extra") ?? "").trim() || null;

  if (!title) return { error: "Bitte einen Titel eingeben." };
  if (!DATE.test(date)) return { error: "Bitte ein Datum wählen." };
  if ((time && !TIME.test(time)) || (returnTime && !TIME.test(returnTime))) return { error: "Bitte eine gültige Uhrzeit wählen." };
  if (returnDate && (!DATE.test(returnDate) || returnDate < date)) return { error: "Die Rückgabe darf nicht vor dem Termin liegen." };
  if (returnTime && !returnDate) return { error: "Bitte zur Rückgabe-Uhrzeit auch ein Datum wählen." };

  const supabase = createAdminClient();

  // Extra für den Zeitraum sperren, damit es auf der Website nicht doppelt gebucht wird
  let blockId: string | null = null;
  if (extraId) {
    const { data: block, error } = await supabase
      .from("availability_blocks")
      .insert({ extra_id: extraId, start_date: date, end_date: returnDate ?? date, blocked_quantity: 1, note: `Eigener Termin: ${title}` })
      .select("id")
      .single();
    if (error || !block) return { error: "Die Sperre für das Extra konnte nicht gespeichert werden." };
    blockId = block.id;
  }

  const { error } = await supabase.from("admin_appointments").insert({
    title,
    date,
    time,
    return_date: returnDate,
    return_time: returnTime,
    note,
    block_id: blockId,
  });
  if (error) {
    if (blockId) await supabase.from("availability_blocks").delete().eq("id", blockId);
    return { error: "Termin konnte nicht gespeichert werden." };
  }

  revalidate();
  return { success: true };
}

/** Termin löschen – eine dazugehörige Extra-Sperre wird mit entfernt. */
export async function deleteAppointment(id: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };

  const supabase = createAdminClient();
  const { data: row } = await supabase.from("admin_appointments").select("block_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("admin_appointments").delete().eq("id", id);
  if (error) return { error: "Termin konnte nicht gelöscht werden." };
  if (row?.block_id) await supabase.from("availability_blocks").delete().eq("id", row.block_id);

  revalidate();
  return { success: true };
}

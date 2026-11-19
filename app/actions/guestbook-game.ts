"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { logActivity } from "@/lib/activity-log";
import { GAME_OCCASIONS, MAX_NAMES_LENGTH, cleanCustomTasks, type GameOccasion } from "@/lib/guestbook-game";
import { bookedExtraNamesFor, ensureGame, gameAccess } from "@/lib/guestbook-game-server";
import type { Booking } from "@/lib/types";

export interface GameActionResult {
  error?: string;
  success?: boolean;
}

/** Kunde passt im Portal Anlass, Namen und eigene Aufgaben an. */
export async function saveGuestbookGame(_prev: GameActionResult, formData: FormData): Promise<GameActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  const game = await ensureGame(booking);
  if (!game) return { error: "Das Spiel konnte nicht geladen werden. Bitte versuch es gleich noch einmal." };
  if (!gameAccess(booking, await bookedExtraNamesFor(booking.id), game).active) return { error: "Das Gästebuch-Spiel ist für diese Buchung nicht freigeschaltet." };

  const occasion = String(formData.get("occasion") ?? "") as GameOccasion;
  if (!GAME_OCCASIONS.includes(occasion)) return { error: "Bitte einen Anlass wählen." };
  const names = String(formData.get("names") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAMES_LENGTH) || null;
  const customTasks = cleanCustomTasks(formData.get("custom_tasks"));

  const { error } = await createAdminClient()
    .from("guestbook_games")
    .update({ occasion, names, custom_tasks: customTasks, updated_at: new Date().toISOString() })
    .eq("booking_id", booking.id);
  if (error) return { error: "Konnte nicht gespeichert werden. Bitte versuch es noch einmal." };
  revalidatePath("/dashboard/audiogaestebuch");
  return { success: true };
}

/** Admin: Spiel ohne Aufpreis freischalten oder wieder sperren. */
export async function setGuestbookGameEnabled(bookingId: string, enabled: boolean): Promise<GameActionResult> {
  if (!(await isAdminAuthenticated())) return { error: "Nicht angemeldet." };
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!booking) return { error: "Buchung nicht gefunden." };
  const game = await ensureGame(booking as Booking);
  if (!game) return { error: "Konnte nicht gespeichert werden." };
  const { error } = await supabase.from("guestbook_games").update({ admin_enabled: enabled, updated_at: new Date().toISOString() }).eq("booking_id", bookingId);
  if (error) return { error: "Konnte nicht gespeichert werden." };
  await logActivity(bookingId, "gaestebuch_spiel", enabled ? "Gästebuch-Spiel ohne Aufpreis freigeschaltet." : "Freischaltung des Gästebuch-Spiels zurückgenommen.");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

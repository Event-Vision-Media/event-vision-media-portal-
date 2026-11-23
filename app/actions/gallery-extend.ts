"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { GALLERY_DAYS, GALLERY_EXTENSIONS, GALLERY_MAX_DAYS } from "@/lib/event-gallery";
import { galleryState, getGalleryForBooking } from "@/lib/event-gallery-server";

/** Kunde verlängert die Online-Galerie im Portal – der Betrag kommt zum Restbetrag bzw. als Nachzahlung. */
export async function extendGallery(days: number): Promise<{ error?: string; until?: string }> {
  const b = await getCurrentBooking();
  if (!b) return { error: "Bitte melde dich erneut an." };
  const option = GALLERY_EXTENSIONS.find((o) => o.days === days);
  if (!option) return { error: "Ungültige Auswahl." };
  const g = await getGalleryForBooking(b.id);
  if (!g || galleryState(g) !== "online" || !g.expires_at) return { error: "Die Galerie ist gerade nicht online." };
  if (GALLERY_DAYS + g.extension_days + days > GALLERY_MAX_DAYS) return { error: `Insgesamt sind höchstens ${GALLERY_MAX_DAYS} Tage möglich.` };
  const until = new Date(new Date(g.expires_at).getTime() + days * 86_400_000).toISOString();
  const { error } = await createAdminClient()
    .from("event_galleries")
    .update({ extension_days: g.extension_days + days, extension_price: Number(g.extension_price) + option.price, expires_at: until })
    .eq("id", g.id);
  if (error) return { error: "Das hat nicht geklappt. Bitte versuch es gleich noch einmal." };
  await logActivity(b.id, "galerie_verlaengert", `🎬 Kunde hat die Online-Galerie um ${days} Tage verlängert (${option.price} €) – bis ${new Date(until).toLocaleDateString("de-DE")}, kommt zum Restbetrag/Nachzahlung.`);
  revalidatePath("/dashboard");
  return { until };
}

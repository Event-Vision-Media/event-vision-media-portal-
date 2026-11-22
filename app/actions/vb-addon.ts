"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionVbEvent } from "@/lib/visionbooth-provision";
import { logActivity } from "@/lib/activity-log";
import { daysUntil } from "@/lib/catalog";
import { ADDON_CHARGED, getPlan, guessOccasion, type VbPlanId } from "@/components/visionbooth/packages";
import { vbUpsellLive } from "@/lib/vb-upsell";

const ALLOWED: VbPlanId[] = ["addon-privat", "addon-privat-ki", "addon-firma"];

/**
 * Kunde bucht im Portal die VisionBooth zu seiner Buchung dazu. Keine Online-Zahlung:
 * Der Preis kommt als Position in den Vertrag und damit in Restbetrag bzw. Nachzahlung.
 */
export async function bookVbAddon(planId: string, startNow: boolean): Promise<{ success?: boolean; manageUrl?: string; error?: string }> {
  const b = await getCurrentBooking();
  if (!b) return { error: "Bitte melde dich erneut an." };
  if (!vbUpsellLive()) return { error: "Dieses Angebot ist gerade nicht verfügbar." };
  if (b.lifecycle !== "bestaetigt") return { error: "Das geht erst nach der Auftragsbestätigung." };
  if (daysUntil(b.event_date) < 2) return { error: "So kurzfristig geht das leider nicht mehr online – ruf uns gern an." };
  const firma = b.customer_type === "business" || Boolean(b.company);
  const plan = getPlan(firma ? "addon-firma" : ALLOWED.includes(planId as VbPlanId) && planId !== "addon-firma" ? planId : "addon-privat-ki");
  if (!firma && !startNow) return { error: "Bitte bestätige, dass wir sofort mit der Einrichtung starten dürfen." };

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("vb_events").select("id").eq("booking_id", b.id).maybeSingle();
  if (existing) return { error: "Für diese Buchung gibt es schon eine VisionBooth." };

  const res = await provisionVbEvent({
    plan: plan.id,
    occasion: guessOccasion(b.occasion, firma),
    title: [b.occasion, b.company || b.couple_names || b.customer_name].filter(Boolean).join(" · ") || "VisionBooth",
    frameText: b.company || b.couple_names || b.customer_name,
    eventDate: b.event_date,
    eventDays: b.event_days ?? 1,
    contactName: b.customer_name || b.couple_names,
    contactEmail: b.email,
    company: b.company,
    bookingId: b.id,
    sendMail: Boolean(b.email),
  });
  if ("error" in res) return { error: "Das hat leider nicht geklappt. Bitte versuch es gleich noch einmal oder melde dich bei uns." };
  await supabase.from("vb_events").update({ package: ADDON_CHARGED }).eq("id", res.id);
  await logActivity(
    b.id,
    "vb_zusatz",
    `📱 Kunde hat die VisionBooth dazugebucht: ${plan.label} für ${plan.price} € – kommt zum Restbetrag/Nachzahlung${!firma ? " · Zustimmung zum sofortigen Beginn erteilt" : ""}`
  );
  revalidatePath("/dashboard");
  return { success: true, manageUrl: res.manageUrl };
}

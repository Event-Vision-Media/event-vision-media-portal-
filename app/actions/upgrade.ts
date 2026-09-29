"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { daysUntil, formatEuro, priceSelection, upgradeOffers } from "@/lib/catalog";
import { sendEmail } from "@/lib/email";

export interface UpgradeResult {
  success?: boolean;
  error?: string;
}

/**
 * Kunde bucht im Portal ein höheres Paket desselben Produkts (z. B.
 * Audiogästebuch Basis → Komfort). Der Preis wird serverseitig neu berechnet.
 */
export async function upgradePackage(fromId: string, toId: string): Promise<UpgradeResult> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  if (!["reserviert", "bestaetigt"].includes(booking.lifecycle)) return { error: "Diese Buchung kann nicht mehr geändert werden." };
  if (daysUntil(booking.event_date) < 2) return { error: "So kurz vor dem Event bitte direkt bei uns melden." };

  const items = booking.inquiry_items;
  const packageIds = (items?.packages ?? []).map((p) => p.id);
  const offer = upgradeOffers(packageIds).find((o) => o.from.id === fromId && o.to.id === toId);
  if (!offer) return { error: "Dieses Upgrade ist nicht verfügbar." };

  const newPackageIds = packageIds.map((id) => (id === fromId ? toId : id));
  const repriced = priceSelection(
    newPackageIds,
    (items?.extras ?? []).map((e) => e.id),
    items?.days ?? booking.event_days ?? 1,
    booking.customer_type === "business"
  );

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      inquiry_items: { ...items, ...repriced },
      total_price: repriced.total,
    })
    .eq("id", booking.id);
  if (error) return { error: "Das Upgrade konnte nicht gespeichert werden." };

  const message = `Upgrade gebucht: ${offer.from.name} → ${offer.to.name} (+${formatEuro(offer.diff)}), neuer Gesamtpreis ${formatEuro(repriced.total)}`;
  await logActivity(booking.id, "upgrade", message);
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Upgrade ${booking.booking_code}: ${offer.to.name}`,
      html: `<p>${booking.couple_names} (${booking.booking_code}) hat im Kundenportal ein Upgrade gebucht:</p><p><strong>${message}</strong></p>`,
      text: `${booking.couple_names} (${booking.booking_code}): ${message}`,
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

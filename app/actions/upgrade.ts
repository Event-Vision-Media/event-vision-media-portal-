"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { MIN_LEAD_DAYS, PACKAGES, PRODUCT_LABELS, applyOffer, daysUntil, formatEuro, priceSelection, upgradeOffers, type PickupId } from "@/lib/catalog";
import { checkDeviceAvailability } from "@/lib/inquiry-server";
import { travelForAddress } from "@/lib/distance";
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
  const repriced = applyOffer(priceSelection(
    newPackageIds,
    (items?.extras ?? []).map((e) => e.id),
    items?.days ?? booking.event_days ?? 1,
    booking.customer_type === "business",
    items?.access ?? null,
    { pickup: (items?.pickup as PickupId | null) ?? null, travel: items?.travel ?? null }
  ), items?.offer);

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

/**
 * Kunde bucht im Portal ein weiteres Gerät dazu (z. B. Fotospiegel zum
 * Audiogästebuch) – nur wenn es am Eventtag frei ist. Preis inkl. Anfahrt
 * wird serverseitig neu berechnet; Lieferzeiten klären wir danach.
 */
export async function addDevicePackage(packageId: string): Promise<UpgradeResult> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  if (!["reserviert", "bestaetigt"].includes(booking.lifecycle)) return { error: "Diese Buchung kann nicht mehr geändert werden." };
  if (daysUntil(booking.event_date) < MIN_LEAD_DAYS) return { error: "So kurzfristig bitte direkt bei uns melden – wir prüfen das gern." };

  const items = booking.inquiry_items;
  const business = booking.customer_type === "business";
  const pkg = PACKAGES.find((p) => p.id === packageId);
  const packageIds = (items?.packages ?? []).map((p) => p.id);
  if (!pkg || (pkg.businessOnly && !business)) return { error: "Dieses Paket ist nicht verfügbar." };
  if ((items?.packages ?? []).some((p) => p.product === pkg.product)) return { error: "Dieses Gerät ist schon gebucht." };

  const days = items?.days ?? booking.event_days ?? 1;
  const { available } = await checkDeviceAvailability([pkg.product], booking.event_date, days, booking.id);
  if (!available) return { error: `Der ${PRODUCT_LABELS[pkg.product]} ist an eurem Termin leider schon vergeben.` };

  // Bisher evtl. nur Selbstabholung – jetzt liefern wir: Anfahrt berechnen, Abholung am Folgetag
  const travel = items?.travel ?? (booking.location ? await travelForAddress(booking.location) : null);
  const pickup = ((items?.pickup as PickupId | null) ?? "folgetag") as PickupId;
  const repriced = applyOffer(priceSelection([...packageIds, pkg.id], (items?.extras ?? []).map((e) => e.id), days, business, items?.access ?? null, { pickup, travel }), items?.offer);
  if (!repriced.packages.some((p) => p.id === pkg.id)) return { error: "Dieses Paket ist nicht verfügbar." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ inquiry_items: { ...items, ...repriced, pickup, travel }, total_price: repriced.total })
    .eq("id", booking.id);
  if (error) return { error: "Das Gerät konnte nicht hinzugefügt werden." };

  const message = `Gerät dazugebucht: ${pkg.name} (${formatEuro(pkg.price)}), neuer Gesamtpreis ${formatEuro(repriced.total)} – Lieferung, Aufbau und Ansprechpartner vor Ort abstimmen`;
  await logActivity(booking.id, "geraet_dazu", message);
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Dazugebucht ${booking.booking_code}: ${pkg.name}`,
      html: `<p>${booking.couple_names} (${booking.booking_code}, ${booking.event_date}) hat im Kundenportal ein Gerät dazugebucht:</p><p><strong>${message}</strong></p>`,
      text: `${booking.couple_names} (${booking.booking_code}): ${message}`,
    });
  }
  revalidatePath("/dashboard");
  return { success: true };
}

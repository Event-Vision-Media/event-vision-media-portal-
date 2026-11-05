"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { MIN_LEAD_DAYS, PACKAGES, PRODUCT_LABELS, applyOffer, daysUntil, formatEuro, hasDelivery, priceSelection, staffFor, upgradeOffers, withStaffHours, type PickupId } from "@/lib/catalog";
import { checkDeviceAvailability } from "@/lib/inquiry-server";
import { travelForAddress } from "@/lib/distance";
import { sendEmail } from "@/lib/email";
import { DELIVERY_UPSELL_MIN_DAYS, deliveryUpsells, isDeliverySwitch } from "@/lib/delivery-upsell";
import type { Booking } from "@/lib/types";
import { STAFF_INCLUDED_HOURS as STAFF_BASE_HOURS } from "@/lib/catalog";
import { staffUpsellFor } from "@/lib/staff-upsell";

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

  if (isDeliverySwitch(fromId, toId)) return { error: "Die Lieferung bitte über „Lieber ganz bequem?“ dazubuchen." };

  const newPackageIds = packageIds.map((id) => (id === fromId ? toId : id));
  const extraIds = (items?.extras ?? []).map((e) => e.id);
  // Kommt durch das Upgrade eine Lieferung dazu, Anfahrt und Abholung wie bei der Anfrage berechnen
  const newPackages = newPackageIds.map((id) => PACKAGES.find((p) => p.id === id)).filter((p): p is (typeof PACKAGES)[number] => Boolean(p));
  const delivered = hasDelivery(newPackages, extraIds);
  const travel = delivered ? items?.travel ?? (booking.location ? await travelForAddress(booking.location) : null) : items?.travel ?? null;
  const pickup = delivered ? ((items?.pickup as PickupId | null) ?? "folgetag") : ((items?.pickup as PickupId | null) ?? null);
  const repriced = applyOffer(priceSelection(
    newPackageIds,
    extraIds,
    items?.days ?? booking.event_days ?? 1,
    booking.customer_type === "business",
    items?.access ?? null,
    { pickup, travel }
  ), items?.offer);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      inquiry_items: { ...items, ...repriced, pickup, travel },
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

// ---------------------------------------------------------------------------
// Lieferung nachträglich dazubuchen („Lieber ganz bequem?“)
// ---------------------------------------------------------------------------

type DeliveryPickup = "folgetag" | "abend";

export interface DeliveryQuote {
  error?: string;
  /** Entfernung unklar oder zu weit – wir melden uns persönlich */
  contact?: boolean;
  price?: number;
  travelPrice?: number;
  km?: number | null;
  newTotal?: number;
}

async function deliveryPlan(booking: Booking, key: string, pickupRaw: string) {
  if (!["reserviert", "bestaetigt"].includes(booking.lifecycle)) return { error: "Diese Buchung kann nicht mehr geändert werden." } as const;
  if (daysUntil(booking.event_date) < DELIVERY_UPSELL_MIN_DAYS) return { error: "So kurzfristig bitte direkt bei uns melden – wir prüfen das gern." } as const;
  const { count } = await createAdminClient().from("booking_contracts").select("id", { count: "exact", head: true }).eq("booking_id", booking.id);
  if (count || booking.contract_on_file) return { error: "Der Mietvertrag ist schon unterschrieben – schreib uns kurz, dann tragen wir die Lieferung ein." } as const;

  const items = booking.inquiry_items;
  const upsell = deliveryUpsells(items).find((u) => u.key === key);
  if (!items?.packages || !upsell) return { error: "Für diese Buchung ist keine Lieferung mehr nötig." } as const;
  const pickup: DeliveryPickup = pickupRaw === "abend" ? "abend" : "folgetag";

  const travel = items.travel ?? (booking.location ? await travelForAddress(booking.location) : null);
  if (!travel || travel.status !== "ok") return { contact: true, upsell } as const;

  const packageIds = items.packages.map((p) => (upsell.kind === "package" && p.id === key ? upsell.targetId : p.id));
  const extraIds = [...(items.extras ?? []).map((e) => e.id), ...(upsell.kind === "extra" ? [upsell.targetId] : [])];
  let priced = priceSelection(packageIds, extraIds, items.days ?? booking.event_days ?? 1, booking.customer_type === "business", items.access ?? null, { pickup, travel });
  if (items.staff?.hours && staffFor({ ...priced, staff: items.staff })) priced = withStaffHours({ ...priced, staff: items.staff }, items.staff.hours);
  const repriced = applyOffer(priced, items.offer);
  return { upsell, pickup, travel, repriced } as const;
}

/** Preis mit Anfahrt anzeigen, bevor der Kunde verbindlich bucht. */
export async function deliveryQuote(key: string, pickup: string): Promise<DeliveryQuote> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  const plan = await deliveryPlan(booking, String(key), String(pickup));
  if ("error" in plan) return { error: plan.error };
  if ("contact" in plan) return { contact: true };
  const travelPrice = plan.travel.price ?? 0;
  return { price: plan.upsell.price, travelPrice, km: plan.travel.km, newTotal: plan.repriced.total };
}

/** Lieferung verbindlich dazubuchen – bzw. bei unklarer Entfernung: Wunsch an uns weitergeben. */
export async function bookDelivery(key: string, pickup: string): Promise<UpgradeResult & { contact?: boolean }> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  const plan = await deliveryPlan(booking, String(key), String(pickup));
  if ("error" in plan) return { error: plan.error };

  if ("contact" in plan) {
    await logActivity(booking.id, "lieferung_wunsch", `Kunde wünscht Lieferung für ${plan.upsell.deviceName} – Entfernung unklar, bitte melden`);
    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Lieferwunsch ${booking.booking_code} – bitte Entfernung prüfen`,
        html: `<p>${booking.couple_names} (${booking.booking_code}, ${booking.event_date}) möchte ${plan.upsell.deviceName} geliefert bekommen. Die Entfernung zur Location ließ sich nicht automatisch berechnen oder liegt über 100 km – bitte kurz melden und im Admin unter „Extras ändern“ eintragen.</p><p>Location: ${booking.location ?? "–"}</p>`,
        text: `${booking.couple_names} (${booking.booking_code}) möchte Lieferung für ${plan.upsell.deviceName}. Entfernung bitte prüfen. Location: ${booking.location ?? "–"}`,
      });
    }
    return { success: true, contact: true };
  }

  const items = booking.inquiry_items;
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ inquiry_items: { ...items, ...plan.repriced, pickup: plan.pickup, travel: plan.travel }, total_price: plan.repriced.total })
    .eq("id", booking.id);
  if (error) return { error: "Die Lieferung konnte nicht gespeichert werden." };

  const pickupText = plan.pickup === "abend" ? "Abholung am selben Abend bis 22 Uhr" : "Abholung am Folgetag";
  const travelText = plan.travel.price ? ` + Anfahrt ${formatEuro(plan.travel.price)} (ca. ${plan.travel.km} km)` : "";
  const message = `Lieferung dazugebucht: ${plan.upsell.targetName} (+${formatEuro(plan.upsell.price)}${travelText}), ${pickupText}, neuer Gesamtpreis ${formatEuro(plan.repriced.total)}`;
  await logActivity(booking.id, "lieferung_dazu", message);
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `🚚 Lieferung dazugebucht ${booking.booking_code} · ${booking.event_date}`,
      html: `<p>${booking.couple_names} (${booking.booking_code}, ${booking.event_date}) hat im Kundenportal die Lieferung dazugebucht:</p><p><strong>${message}</strong></p><p>Lieferzeit wählt der Kunde beim Mietvertrag – steht danach im Kalender und Wochenplan.</p>`,
      text: `${booking.couple_names} (${booking.booking_code}): ${message}`,
    });
  }
  revalidatePath("/dashboard");
  revalidatePath("/admin/kalender");
  return { success: true };
}

/**
 * Kunde fragt Betreuung durch Personal für die 360° Video Booth an (keine Buchung – du bestätigst
 * und trägst sie im Admin unter „Extras ändern“ ein).
 */
export async function requestStaff(hours: number, start: string): Promise<UpgradeResult> {
  const booking = await getCurrentBooking();
  if (!booking) return { error: "Bitte melde dich erneut an." };
  const upsell = staffUpsellFor(booking);
  if (!upsell) return { error: "Die Betreuung kann für diese Buchung nicht mehr online angefragt werden – bitte meldet euch kurz bei uns." };
  if (upsell.requested) return { success: true };

  const h = Math.min(STAFF_BASE_HOURS + 6, Math.max(STAFF_BASE_HOURS, Math.round(Number(hours) || STAFF_BASE_HOURS)));
  const st = /^\d{2}:\d{2}$/.test(String(start)) ? String(start) : null;
  const request = { at: new Date().toISOString(), hours: h, start: st };
  const { error } = await createAdminClient()
    .from("bookings")
    .update({ inquiry_items: { ...booking.inquiry_items, staffRequest: request } })
    .eq("id", booking.id);
  if (error) return { error: "Die Anfrage konnte nicht gespeichert werden. Bitte versucht es nochmal." };

  const price = upsell.price + (h - STAFF_BASE_HOURS) * upsell.hourPrice;
  const message = `🎥 Betreuung für die 360° Video Booth angefragt: ${h} Std.${st ? ` ab ${st} Uhr` : ", Uhrzeit offen"} (${formatEuro(price)}${upsell.selfService ? ", dafür Wechsel auf 360° Komfort mit Lieferung nötig" : ""}) – bitte bestätigen und unter „Extras ändern“ eintragen`;
  await logActivity(booking.id, "betreuung_wunsch", message);
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `🎥 Betreuung angefragt ${booking.booking_code} · ${booking.event_date}`,
      html: `<p>${booking.customer_name || booking.couple_names} (${booking.booking_code}, ${booking.event_date}) hat im Kundenportal Betreuung für die 360° Video Booth angefragt:</p><p><strong>${message}</strong></p><p>Bitte prüfen, ob Personal frei ist, dem Kunden kurz zusagen und die Betreuung im Admin unter „Extras ändern“ hinzufügen – danach wählt der Kunde die Startzeit im Portal.</p>`,
      text: `${booking.customer_name || booking.couple_names} (${booking.booking_code}): ${message}`,
    });
  }
  revalidatePath("/dashboard");
  return { success: true };
}

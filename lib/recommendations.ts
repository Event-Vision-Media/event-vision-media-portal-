import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailabilityBoard } from "@/lib/availability-server";
import { extraNamesCoveredByPackages } from "@/lib/catalog";
import { bookingDevices, extraFitsBooking, recommendableFor, sortExtrasForAudience } from "@/lib/audience";
import { formatCurrencyEUR } from "@/lib/format";
import type { AvailabilityInfo } from "@/lib/availability";
import type { Booking, Extra } from "@/lib/types";

export interface Recommendation {
  extra: Extra;
  priceLabel: string;
  availability: AvailabilityInfo | undefined;
}

/**
 * Exclusive Extras, die zur Buchung passen: aktiv, am Eventdatum verfügbar,
 * noch nicht gebucht und nicht schon als Website-Paket enthalten.
 * Wird im Dashboard ("Macht euer Event komplett") und in der
 * Erinnerungs-E-Mail verwendet.
 */
export async function getRecommendations(booking: Booking, limit = 3): Promise<Recommendation[]> {
  const supabase = createAdminClient();
  const [{ data: extrasData }, { data: variantsData }, { data: selections }, board] = await Promise.all([
    supabase
      .from("extras")
      .select("*")
      .eq("is_active", true)
      .neq("category", "Startbildschirm")
      .order("sort_order", { ascending: true }),
    supabase.from("extra_variants").select("extra_id, price, is_available"),
    supabase.from("booking_extras").select("extra_id").eq("booking_id", booking.id),
    getAvailabilityBoard(booking.event_date, booking.id),
  ]);

  const booked = new Set((selections ?? []).map((s) => s.extra_id));
  const covered = new Set(extraNamesCoveredByPackages(booking.inquiry_items));
  const minVariantPrice = new Map<string, number>();
  (variantsData ?? []).forEach((v) => {
    if (v.is_available === false) return;
    minVariantPrice.set(v.extra_id, Math.min(minVariantPrice.get(v.extra_id) ?? Infinity, Number(v.price)));
  });

  const business = booking.customer_type === "business";
  const devices = bookingDevices(booking);
  return sortExtrasForAudience((extrasData ?? []) as Extra[], business)
    .filter((e) => !booked.has(e.id) && !covered.has(e.name))
    .filter((e) => extraFitsBooking(e, devices) && recommendableFor(e, business))
    .filter((e) => board.byExtraId[e.id]?.status !== "ausgebucht")
    .slice(0, limit)
    .map((extra) => ({
      extra,
      priceLabel:
        extra.has_variants && minVariantPrice.has(extra.id)
          ? `ab ${formatCurrencyEUR(minVariantPrice.get(extra.id)!)}`
          : formatCurrencyEUR(Number(extra.price)),
      availability: board.byExtraId[extra.id],
    }));
}

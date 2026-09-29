import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { contractRequired } from "@/lib/contract";
import { getPaymentSummary, type PaymentSummary } from "@/lib/payments";
import type { Booking } from "@/lib/types";

/** Alles, was du für einen Einsatz brauchst – aus Buchung, Vertrag und Zahlungen zusammengeführt. */
export interface BookingInfo {
  booking: Booking;
  items: string[];
  contract: {
    renterAddress: string | null;
    locationAddress: string | null;
    onsiteName: string | null;
    onsitePhone: string | null;
    handover: string | null;
    return: string | null;
    signed: boolean;
    countersigned: boolean;
    billing: { address?: string | null; email?: string | null; poNumber?: string | null; costCenter?: string | null } | null;
  } | null;
  contractNeeded: boolean;
  payment: PaymentSummary | null;
}

export async function loadBookingInfos(bookings: Booking[]): Promise<BookingInfo[]> {
  if (bookings.length === 0) return [];
  const supabase = createAdminClient();
  const ids = bookings.map((b) => b.id);
  const [{ data: extras }, { data: contracts }] = await Promise.all([
    supabase.from("booking_extras").select("booking_id, extras(name), extra_variants(name)").in("booking_id", ids),
    supabase
      .from("booking_contracts")
      .select("booking_id, renter_street, renter_zip_city, location_name, location_street, location_zip_city, onsite_contact_name, onsite_contact_phone, handover_window, return_window, countersigned_at, signed_at, billing:snapshot->billing")
      .in("booking_id", ids)
      .order("signed_at", { ascending: false }),
  ]);

  const extrasBy = new Map<string, string[]>();
  for (const e of (extras ?? []) as any[]) {
    const name = e.extras?.name ? (e.extra_variants?.name ? `${e.extras.name}: ${e.extra_variants.name}` : e.extras.name) : null;
    if (name) extrasBy.set(e.booking_id, [...(extrasBy.get(e.booking_id) ?? []), name]);
  }
  const contractBy = new Map<string, any>();
  for (const c of contracts ?? []) if (!contractBy.has(c.booking_id)) contractBy.set(c.booking_id, c);

  return Promise.all(
    bookings.map(async (b) => {
      const packages = (b.inquiry_items?.packages ?? []).map((p) => p.name);
      const inquiryExtras = (b.inquiry_items?.extras ?? []).map((e) => e.name);
      const dbExtras = extrasBy.get(b.id) ?? [];
      const items = packages.length
        ? [...packages, ...inquiryExtras, ...dbExtras.filter((n) => !inquiryExtras.some((i) => n.startsWith(i.split(" ")[0])))]
        : [b.product_type, ...dbExtras];
      const c = contractBy.get(b.id);
      return {
        booking: b,
        items: Array.from(new Set(items.filter(Boolean))),
        contract: c
          ? {
              renterAddress: [c.renter_street, c.renter_zip_city].filter(Boolean).join(", ") || null,
              locationAddress: [c.location_name, c.location_street, c.location_zip_city].filter(Boolean).join(", ") || null,
              onsiteName: c.onsite_contact_name,
              onsitePhone: c.onsite_contact_phone,
              handover: c.handover_window,
              return: c.return_window,
              signed: true,
              countersigned: Boolean(c.countersigned_at),
              billing: c.billing ?? null,
            }
          : null,
        contractNeeded: contractRequired(b),
        payment: contractRequired(b) ? await getPaymentSummary(b) : null,
      };
    })
  );
}

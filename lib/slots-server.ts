import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHandover } from "@/lib/catalog";
import { parseSlotText, pickupSlotEnd, shiftDate, type Slot } from "@/lib/slots";

/**
 * Schon vergebene Termine für Selbstabholung/Rückgabe bei uns im Datumsbereich (andere Buchungen):
 * aus unterschriebenen Verträgen und von dir im Admin gesetzten Zeiten. Lieferungen zählen nicht –
 * dort ist das Fenster nur die Zugangszeit der Location.
 */
export async function busySelfPickupSlots(excludeBookingId: string, fromDate: string, toDate: string): Promise<Slot[]> {
  const supabase = createAdminClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, inquiry_items, delivery_date, delivery_time, pickup_date, pickup_time")
    .in("lifecycle", ["reserviert", "bestaetigt"])
    .neq("id", excludeBookingId)
    .gte("event_date", shiftDate(fromDate, -6))
    .lte("event_date", shiftDate(toDate, 6))
    .limit(500);
  const pickupOnly = (bookings ?? []).filter((b) => bookingHandover(b.inquiry_items) === "abholung");
  if (!pickupOnly.length) return [];
  const { data: contracts } = await supabase
    .from("booking_contracts")
    .select("booking_id, handover_window, return_window, signed_at")
    .in("booking_id", pickupOnly.map((b) => b.id))
    .order("signed_at", { ascending: false });
  const latest = new Map<string, { handover_window: string | null; return_window: string | null }>();
  for (const c of contracts ?? []) if (!latest.has(c.booking_id)) latest.set(c.booking_id, c);

  const hm = (t: string | null) => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);
  const busy: Slot[] = [];
  for (const b of pickupOnly) {
    const c = latest.get(b.id);
    // Von dir im Admin gesetzte Zeit hat Vorrang vor dem Vertragsfenster
    const h = b.delivery_date && hm(b.delivery_time) ? { date: b.delivery_date, from: hm(b.delivery_time)!, to: pickupSlotEnd(hm(b.delivery_time)!) } : parseSlotText(c?.handover_window);
    const r = b.pickup_date && hm(b.pickup_time) ? { date: b.pickup_date, from: hm(b.pickup_time)!, to: pickupSlotEnd(hm(b.pickup_time)!) } : parseSlotText(c?.return_window);
    for (const s of [h, r]) if (s && s.date >= fromDate && s.date <= toDate) busy.push(s);
  }
  return busy;
}

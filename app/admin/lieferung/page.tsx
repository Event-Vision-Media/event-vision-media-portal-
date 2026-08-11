import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingSelect } from "@/components/admin/BookingSelect";
import { DeliveryPickupForm } from "@/components/admin/DeliveryPickupForm";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPickupPage({
  searchParams,
}: {
  searchParams: { booking?: string };
}) {
  const supabase = createAdminClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_code, couple_names")
    .order("event_date", { ascending: true });

  const allBookings = bookings ?? [];
  const selectedBookingId = searchParams.booking;

  let selectedBooking: Booking | null = null;
  if (selectedBookingId) {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", selectedBookingId)
      .maybeSingle();
    selectedBooking = (data as Booking | null) ?? null;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">
          Lieferung &amp; Abholung
        </h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Trage Datum, Uhrzeit und Ansprechpartner für Lieferung und Abholung je Buchung ein.
        </p>

        <BookingSelect
          bookings={allBookings}
          selectedId={selectedBookingId}
          basePath="/admin/lieferung"
        />

        {selectedBooking && (
          <Card className="mt-6">
            <p className="mb-4 text-sm text-anthracite-500">
              Für <strong>{selectedBooking.couple_names}</strong> ({selectedBooking.booking_code})
            </p>
            <DeliveryPickupForm booking={selectedBooking} />
          </Card>
        )}

        {!selectedBooking && (
          <p className="mt-6 text-sm text-anthracite-400">
            Wähle oben einen Kunden aus, um dessen Liefer- und Abholdaten zu verwalten.
          </p>
        )}
      </main>
    </div>
  );
}

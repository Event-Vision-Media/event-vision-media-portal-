import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingSelect } from "@/components/admin/BookingSelect";
import { NewLayoutProofForm } from "@/components/admin/NewLayoutProofForm";
import { LayoutProofGroup } from "@/components/admin/LayoutProofGroup";
import { Card } from "@/components/ui/Card";
import type { LayoutProof } from "@/lib/types";

export default async function AdminLayoutProofsPage({
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
  const selectedBooking = allBookings.find((b) => b.id === selectedBookingId);

  let proofs: LayoutProof[] = [];
  if (selectedBookingId) {
    const { data } = await supabase
      .from("layout_proofs")
      .select("*")
      .eq("booking_id", selectedBookingId)
      .order("version", { ascending: false });
    proofs = (data ?? []) as LayoutProof[];
  }

  const groupedByName = new Map<string, LayoutProof[]>();
  proofs.forEach((proof) => {
    const list = groupedByName.get(proof.layout_name) ?? [];
    list.push(proof);
    groupedByName.set(proof.layout_name, list);
  });
  const layoutNames = Array.from(groupedByName.keys());

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">
          Layout-Verwaltung
        </h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Lade individuelle Layout-Entwürfe hoch und verfolge die Freigabe durch den Kunden.
        </p>

        <BookingSelect bookings={allBookings} selectedId={selectedBookingId} />

        {selectedBooking && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <p className="text-sm text-anthracite-500">
                Layouts für <strong>{selectedBooking.couple_names}</strong> ({selectedBooking.booking_code})
              </p>
              {layoutNames.length === 0 && (
                <p className="text-sm text-anthracite-400">Noch keine Layouts hochgeladen.</p>
              )}
              {layoutNames.map((name) => (
                <LayoutProofGroup key={name} layoutName={name} versions={groupedByName.get(name)!} />
              ))}
            </div>

            <Card className="h-fit">
              <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
                Neues Layout hochladen
              </h2>
              <NewLayoutProofForm bookingId={selectedBooking.id} existingLayoutNames={layoutNames} />
            </Card>
          </div>
        )}

        {!selectedBooking && (
          <p className="mt-6 text-sm text-anthracite-400">
            Wähle oben einen Kunden aus, um dessen Layouts zu verwalten.
          </p>
        )}
      </main>
    </div>
  );
}

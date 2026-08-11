import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingSelect } from "@/components/admin/BookingSelect";
import { NewPersonalizedScreenProofForm } from "@/components/admin/NewPersonalizedScreenProofForm";
import { PersonalizedScreenProofPanel } from "@/components/admin/PersonalizedScreenProofPanel";
import { PersonalizationDetailsCard } from "@/components/admin/PersonalizationDetailsCard";
import { SelectedHomeScreenSummary } from "@/components/admin/SelectedHomeScreenSummary";
import { Card } from "@/components/ui/Card";
import type { PersonalizedScreenProof, PersonalizedScreenRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPersonalizedScreenPage({
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

  let request: PersonalizedScreenRequest | null = null;
  let proofs: PersonalizedScreenProof[] = [];
  let homeScreenInfo: {
    homeScreen: { name: string; preview_image_url: string } | null;
    productType: string;
  } | null = null;
  if (selectedBookingId) {
    const [{ data: requestData }, { data: proofsData }, { data: bookingDetail }] = await Promise.all([
      supabase
        .from("personalized_screen_requests")
        .select("*")
        .eq("booking_id", selectedBookingId)
        .maybeSingle(),
      supabase
        .from("personalized_screen_proofs")
        .select("*")
        .eq("booking_id", selectedBookingId)
        .order("version", { ascending: false }),
      supabase
        .from("bookings")
        .select("product_type, home_screens(name, preview_image_url)")
        .eq("id", selectedBookingId)
        .maybeSingle(),
    ]);
    request = (requestData as PersonalizedScreenRequest | null) ?? null;
    proofs = (proofsData ?? []) as PersonalizedScreenProof[];
    homeScreenInfo = bookingDetail
      ? {
          homeScreen: (bookingDetail as any).home_screens ?? null,
          productType: (bookingDetail as any).product_type,
        }
      : null;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">
          Startbildschirm-Freigabe
        </h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Sieh dir die Angaben des Kunden an, lade den gestalteten Startbildschirm hoch und
          verfolge die Freigabe.
        </p>

        <BookingSelect
          bookings={allBookings}
          selectedId={selectedBookingId}
          basePath="/admin/startbildschirm-freigaben"
        />

        {selectedBooking && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <p className="text-sm text-anthracite-500">
                Startbildschirm für <strong>{selectedBooking.couple_names}</strong> (
                {selectedBooking.booking_code})
              </p>
              {homeScreenInfo && (
                <SelectedHomeScreenSummary
                  homeScreen={homeScreenInfo.homeScreen}
                  productType={homeScreenInfo.productType}
                  isPersonalizedBooked={Boolean(request)}
                />
              )}
              <PersonalizationDetailsCard request={request} />
              <PersonalizedScreenProofPanel versions={proofs} />
            </div>

            <Card className="h-fit">
              <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
                Neuen Entwurf hochladen
              </h2>
              <NewPersonalizedScreenProofForm bookingId={selectedBooking.id} />
            </Card>
          </div>
        )}

        {!selectedBooking && (
          <p className="mt-6 text-sm text-anthracite-400">
            Wähle oben einen Kunden aus, um dessen personalisierten Startbildschirm zu verwalten.
          </p>
        )}
      </main>
    </div>
  );
}

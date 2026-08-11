import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { LayoutGallery } from "@/components/LayoutGallery";
import type { Layout } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LayoutSelectionPage() {
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const { data: layouts } = await supabase
    .from("layouts")
    .select("*")
    .order("sort_order", { ascending: true });

  const allLayouts = (layouts ?? []) as Layout[];
  const inclusiveLayouts = allLayouts.filter((l) => !l.is_premium);
  const premiumLayouts = allLayouts.filter((l) => l.is_premium);

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-anthracite-400 transition hover:text-anthracite-700"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3 animate-fade-in-up">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-anthracite-800 sm:text-3xl">
            Wählt euer Foto-Layout
          </h1>
          <p className="mt-1 mb-6 text-anthracite-500">
            Tippt auf ein Layout für eine größere Vorschau und wählt dann euren
            Favoriten aus.
          </p>
        </div>

        <LayoutGallery
          inclusiveLayouts={inclusiveLayouts}
          premiumLayouts={premiumLayouts}
          selectedLayoutId={booking.selected_layout_id}
          coupleNames={booking.couple_names}
          initialPersonalizationName={booking.personalization_name}
          initialPersonalizationDate={booking.personalization_date}
          initialExtraWishes={booking.extra_wishes}
          hasConsentedBefore={Boolean(booking.personalization_name)}
          premiumIncluded={booking.premium_layout_included}
        />
      </main>

      <Footer />
    </div>
  );
}

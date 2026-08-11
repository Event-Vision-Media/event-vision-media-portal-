import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { StartscreenGallery } from "@/components/StartscreenGallery";
import { PersonalizedScreenWorkflow } from "@/components/PersonalizedScreenWorkflow";
import type {
  Extra,
  HomeScreen,
  PersonalizedScreenExample,
  PersonalizedScreenProof,
  PersonalizedScreenRequest,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StartbildschirmPage() {
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const [
    { data: homeScreens },
    { data: personalizedExtras },
    { data: bookingExtras },
    { data: example },
    { data: personalizationRequest },
    { data: personalizationProofs },
  ] = await Promise.all([
    supabase
      .from("home_screens")
      .select("*")
      .eq("product_type", booking.product_type)
      .order("sort_order", { ascending: true }),
    supabase
      .from("extras")
      .select("*")
      .eq("category", "Startbildschirm")
      .eq("is_active", true)
      .limit(1),
    supabase
      .from("booking_extras")
      .select("extra_id, added_by_admin")
      .eq("booking_id", booking.id),
    supabase
      .from("personalized_screen_examples")
      .select("*")
      .eq("product_type", booking.product_type)
      .maybeSingle(),
    supabase
      .from("personalized_screen_requests")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("personalized_screen_proofs")
      .select("*")
      .eq("booking_id", booking.id)
      .order("version", { ascending: false }),
  ]);

  const personalizedExtra = ((personalizedExtras ?? [])[0] as Extra | undefined) ?? null;
  const personalizedSelection = personalizedExtra
    ? (bookingExtras ?? []).find((be) => be.extra_id === personalizedExtra.id)
    : undefined;
  const isPersonalizedBooked = Boolean(personalizedSelection);
  const isPersonalizedLocked = Boolean(personalizedSelection?.added_by_admin);
  const personalizedExampleImageUrl =
    (example as PersonalizedScreenExample | null)?.example_image_url ?? null;

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
            Wählt euren Startbildschirm
          </h1>
          <p className="mt-1 text-anthracite-500">
            Passend zu eurem gebuchten{" "}
            <span className="font-medium text-anthracite-700">{booking.product_type}</span>{" "}
            haben wir euch drei Startbildschirme zur Auswahl vorbereitet.
          </p>
          <p className="mb-6 mt-1 text-anthracite-500">
            Ihr möchtet lieber etwas ganz Eigenes? Weiter unten könnt ihr einen individuell
            personalisierten Startbildschirm dazubuchen.
          </p>
        </div>

        <StartscreenGallery
          productType={booking.product_type}
          homeScreens={(homeScreens ?? []) as HomeScreen[]}
          selectedHomeScreenId={booking.selected_home_screen_id}
          personalizedExtra={personalizedExtra}
          isPersonalizedBooked={isPersonalizedBooked}
          isPersonalizedLocked={isPersonalizedLocked}
          personalizedExampleImageUrl={personalizedExampleImageUrl}
        />

        {isPersonalizedBooked && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-5 w-1 rounded-full bg-gold-500" />
              <h2 className="font-serif text-xl font-semibold tracking-tight text-anthracite-800">
                Euer personalisierter Startbildschirm
              </h2>
            </div>
            <PersonalizedScreenWorkflow
              initialRequest={(personalizationRequest as PersonalizedScreenRequest | null) ?? null}
              proofs={(personalizationProofs ?? []) as PersonalizedScreenProof[]}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

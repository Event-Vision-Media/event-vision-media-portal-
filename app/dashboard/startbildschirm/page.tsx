import Link from "next/link";
import { EXTRAS as CATALOG_EXTRAS, formatEuro, includedExtraIds } from "@/lib/catalog";

const BRANDING_PRICE = CATALOG_EXTRAS.find((e) => e.id === "branding")?.price ?? 69;
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
  const sie = booking.customer_type === "business";
  const t = (ihr: string, s: string) => (sie ? s : ihr);
  // Firmen: Startbildschirm mit Logo ist Teil von "Corporate Branding"
  const hasBranding =
    sie && ((booking.inquiry_items?.extras ?? []).some((e) => e.id === "branding") || includedExtraIds(booking.inquiry_items).has("branding"));
  const isPersonalizedBooked = Boolean(personalizedSelection) || hasBranding;
  const isPersonalizedLocked = Boolean(personalizedSelection?.added_by_admin) || hasBranding;
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
            {t("Wählt euren Startbildschirm", "Ihr Startbildschirm")}
          </h1>
          {(homeScreens ?? []).length > 0 && (
            <p className="mt-1 text-anthracite-500">
              {t("Passend zu eurem gebuchten", "Passend zu Ihrem gebuchten")}{" "}
              <span className="font-medium text-anthracite-700">{booking.product_type}</span>{" "}
              {t("haben wir euch", "haben wir Ihnen")}{" "}
              {(homeScreens ?? []).length === 1 ? "einen Startbildschirm" : `${(homeScreens ?? []).length} Startbildschirme`} zur
              Auswahl vorbereitet.
            </p>
          )}
          <p className="mb-6 mt-1 text-anthracite-500">
            {sie
              ? hasBranding
                ? "Da Sie Corporate Branding gebucht haben, gestalten wir Ihren Startbildschirm mit Ihrem Logo – die Angaben dazu machen Sie weiter unten."
                : "Sie möchten Ihre Gäste mit Ihrem Firmenlogo begrüßen? Das ist Teil unseres Corporate Brandings – siehe unten."
              : "Ihr möchtet lieber etwas ganz Eigenes? Weiter unten könnt ihr einen individuell personalisierten Startbildschirm dazubuchen."}
          </p>
        </div>

        <StartscreenGallery
          productType={booking.product_type}
          homeScreens={(homeScreens ?? []) as HomeScreen[]}
          selectedHomeScreenId={booking.selected_home_screen_id}
          personalizedExtra={sie ? null : personalizedExtra}
          sie={sie}
          isPersonalizedBooked={isPersonalizedBooked}
          isPersonalizedLocked={isPersonalizedLocked}
          personalizedExampleImageUrl={personalizedExampleImageUrl}
        />

        {sie && !hasBranding && (
          <div className="mt-8 rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-5">
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">Startbildschirm mit Ihrem Logo</h2>
            <p className="mt-1 text-sm text-anthracite-600">
              Mit unserem Corporate Branding ({formatEuro(BRANDING_PRICE)}) gestalten wir Startbildschirm, Fotolayout und Video-Overlay
              in Ihrem Corporate Design – inklusive Abstimmung und Freigabe hier im Portal.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="https://wa.me/4917622748363?text=Corporate%20Branding%20f%C3%BCr%20unsere%20Buchung" target="_blank" rel="noreferrer" className="rounded-xl bg-anthracite-900 px-4 py-2 font-medium text-white hover:bg-anthracite-800">Per WhatsApp anfragen</a>
              <a href="mailto:info@fotobox-essen.com?subject=Corporate%20Branding" className="rounded-xl border border-anthracite-200 bg-white px-4 py-2 font-medium text-anthracite-700 hover:border-gold-300">Per E-Mail anfragen</a>
            </div>
          </div>
        )}

        {isPersonalizedBooked && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-5 w-1 rounded-full bg-gold-500" />
              <h2 className="font-serif text-xl font-semibold tracking-tight text-anthracite-800">
                {t("Euer personalisierter Startbildschirm", "Ihr Startbildschirm mit Logo")}
              </h2>
            </div>
            <PersonalizedScreenWorkflow
              initialRequest={(personalizationRequest as PersonalizedScreenRequest | null) ?? null}
              proofs={(personalizationProofs ?? []) as PersonalizedScreenProof[]}
              sie={sie}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

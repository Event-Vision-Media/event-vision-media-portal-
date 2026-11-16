import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { LayoutGallery } from "@/components/LayoutGallery";
import { TemplatesBoothCard } from "@/components/TemplatesBoothCard";
import { TB_LAYOUT_NAME, templatesboothLink } from "@/lib/templatesbooth";
import { SUBMISSION_COLUMNS, type TemplateSubmission } from "@/lib/templatesbooth-server";
import type { Layout } from "@/lib/types";
import { isBusiness, usesSie } from "@/lib/address";
import { hasBrandingBooked, premiumLayoutIncluded } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function LayoutSelectionPage(props: { searchParams: Promise<{ design?: string }> }) {
  const searchParams = await props.searchParams;
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const [{ data: layouts }, { data: submissions }, { data: brandingRequest }] = await Promise.all([
    supabase.from("layouts").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("template_submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("booking_id", booking.id)
      .order("received_at", { ascending: false }),
    supabase.from("personalized_screen_requests").select("photo_url").eq("booking_id", booking.id).maybeSingle(),
  ]);

  // Das Platzhalter-Layout für TemplatesBooth-Designs ist kein auswählbares Layout.
  const allLayouts = ((layouts ?? []) as Layout[]).filter((l) => l.name !== TB_LAYOUT_NAME);
  const sie = usesSie(booking);
  const inclusiveLayouts = allLayouts.filter((l) => !l.is_premium);
  const premiumLayouts = allLayouts.filter((l) => l.is_premium);
  // Corporate Branding: Logo wird einmal beim Startbildschirm hochgeladen und auch fürs Layout verwendet
  const branding = isBusiness(booking) && hasBrandingBooked(booking.inquiry_items);
  const logoUploaded = Boolean(brandingRequest?.photo_url);
  const premiumIncluded = premiumLayoutIncluded(booking);
  const t = (ihr: string, s: string) => (sie ? s : ihr);

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
            {usesSie(booking) ? "Wählen Sie Ihr Foto-Layout" : "Wählt euer Foto-Layout"}
          </h1>
          <p className="mt-1 mb-6 text-anthracite-500">
            {usesSie(booking)
              ? `Tippen Sie auf ein Layout für eine größere Vorschau und wählen Sie dann Ihren Favoriten.${isBusiness(booking) ? " Farben, Logo und Texte passen wir an Ihr Corporate Design an." : ""}`
              : `Tippt auf ein Layout für eine größere Vorschau und wählt dann euren Favoriten aus.${isBusiness(booking) ? " Farben, Logo und Texte passen wir an euer Corporate Design an." : ""}`}
          </p>
        </div>

        {branding && (
          <div className="mb-8 rounded-2xl border border-gold-300 bg-gold-50 p-5">
            <p className="font-serif text-lg font-semibold text-anthracite-800">{t("Euer Corporate Branding", "Ihr Corporate Branding")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-anthracite-700">
              <li>
                {t("Wählt unten euer Lieblings-Layout – ", "Wählen Sie unten Ihr Lieblings-Layout – ")}
                <strong>{t("Premium-Layouts sind bei euch inklusive.", "Premium-Layouts sind bei Ihnen inklusive.")}</strong>
              </li>
              <li>
                {logoUploaded
                  ? t("Euer Logo ist schon da ✓ – wir bauen es ins Layout ein.", "Ihr Logo liegt uns bereits vor ✓ – wir bauen es ins Layout ein.")
                  : t("Ladet euer Logo einmal unter „Startbildschirm“ hoch – wir verwenden es für Layout und Startbildschirm.", "Laden Sie Ihr Logo einmal unter „Startbildschirm“ hoch – wir verwenden es für Layout und Startbildschirm.")}
              </li>
              <li>{t("Ihr bekommt die Entwürfe hier im Portal zur Freigabe.", "Sie erhalten die Entwürfe hier im Portal zur Freigabe.")}</li>
            </ol>
            {!logoUploaded && (
              <Link href="/dashboard/startbildschirm" className="mt-3 inline-block rounded-xl bg-anthracite-900 px-4 py-2 text-sm font-medium text-white hover:bg-anthracite-800">
                {t("Logo hochladen →", "Logo hochladen →")}
              </Link>
            )}
          </div>
        )}

        <div className="mb-10">
          <TemplatesBoothCard
            link={templatesboothLink(process.env.PORTAL_URL || "https://portal.fotobox-essen.com")}
            email={booking.email}
            bookingCode={booking.booking_code}
            eventDate={booking.event_date}
            premiumIncluded={premiumIncluded}
            submissions={(submissions ?? []) as TemplateSubmission[]}
            justSent={searchParams.design === "gesendet"}
            sie={sie}
          />
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
          premiumIncluded={premiumIncluded}
          sie={usesSie(booking)}
          business={isBusiness(booking)}
        />
      </main>

      <Footer />
    </div>
  );
}

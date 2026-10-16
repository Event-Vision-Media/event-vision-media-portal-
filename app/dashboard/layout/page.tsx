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

export const dynamic = "force-dynamic";

export default async function LayoutSelectionPage({ searchParams }: { searchParams: { design?: string } }) {
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const [{ data: layouts }, { data: submissions }] = await Promise.all([
    supabase.from("layouts").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("template_submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("booking_id", booking.id)
      .order("received_at", { ascending: false }),
  ]);

  // Das Platzhalter-Layout für TemplatesBooth-Designs ist kein auswählbares Layout.
  const allLayouts = ((layouts ?? []) as Layout[]).filter((l) => l.name !== TB_LAYOUT_NAME);
  const sie = booking.customer_type === "business";
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
            {booking.customer_type === "business" ? "Wählen Sie Ihr Foto-Layout" : "Wählt euer Foto-Layout"}
          </h1>
          <p className="mt-1 mb-6 text-anthracite-500">
            {booking.customer_type === "business"
              ? "Tippen Sie auf ein Layout für eine größere Vorschau und wählen Sie dann Ihren Favoriten. Farben, Logo und Texte passen wir an Ihr Corporate Design an."
              : "Tippt auf ein Layout für eine größere Vorschau und wählt dann euren Favoriten aus."}
          </p>
        </div>

        <div className="mb-10">
          <TemplatesBoothCard
            link={templatesboothLink(process.env.PORTAL_URL || "https://portal.fotobox-essen.com")}
            email={booking.email}
            bookingCode={booking.booking_code}
            eventDate={booking.event_date}
            premiumIncluded={booking.premium_layout_included}
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
          premiumIncluded={booking.premium_layout_included}
          sie={booking.customer_type === "business"}
        />
      </main>

      <Footer />
    </div>
  );
}

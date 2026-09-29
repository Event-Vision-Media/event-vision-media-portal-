import Link from "next/link";
import { bookingDevices, extraFitsBooking, sortExtrasForAudience } from "@/lib/audience";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { ExtrasSection } from "@/components/ExtrasSection";
import { getAvailabilityBoard } from "@/lib/availability-server";
import type { BookingExtra, Extra, ExtraVariant } from "@/lib/types";
import { extraNamesCoveredByPackages } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function EventHighlightsPage({ searchParams }: { searchParams: { extra?: string } }) {
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const [{ data: extras }, { data: variants }, { data: selections }, availabilityBoard] = await Promise.all([
    supabase
      .from("extras")
      .select("*")
      .eq("is_active", true)
      .neq("category", "Startbildschirm")
      .order("sort_order", { ascending: true }),
    supabase.from("extra_variants").select("*").order("sort_order", { ascending: true }),
    supabase.from("booking_extras").select("*").eq("booking_id", booking.id),
    getAvailabilityBoard(booking.event_date, booking.id),
  ]);

  const coveredByPackages = new Set(extraNamesCoveredByPackages(booking.inquiry_items));
  const sie = booking.customer_type === "business";
  // Reihenfolge je Kundentyp; nur Extras, die zum gebuchten Gerät passen
  const devices = bookingDevices(booking);
  const allExtras = sortExtrasForAudience(
    ((extras ?? []) as Extra[]).filter((e) => !coveredByPackages.has(e.name) && extraFitsBooking(e, devices)),
    sie
  );
  const allVariants = (variants ?? []) as ExtraVariant[];
  const variantsByExtra: Record<string, ExtraVariant[]> = {};
  allVariants.forEach((variant) => {
    (variantsByExtra[variant.extra_id] ??= []).push(variant);
  });

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-anthracite-400 transition hover:text-anthracite-700"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3 mb-6 animate-fade-in-up">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-anthracite-800 sm:text-3xl">
            Event Highlights
          </h1>
          <p className="mt-1 text-anthracite-500">
            {sie
              ? "Ergänzen Sie Ihre Veranstaltung um Extras, die für mehr Aufmerksamkeit, Interaktion und einen reibungslosen Ablauf sorgen."
              : "Macht euer Event noch persönlicher: Wählt besondere Extras, die für unvergessliche Erinnerungen und das gewisse Etwas sorgen."}
          </p>
        </div>

        <ExtrasSection
          extras={allExtras}
          variantsByExtra={variantsByExtra}
          initialSelections={(selections ?? []) as BookingExtra[]}
          initialConfirmedAt={booking.extras_confirmed_at}
          availabilityByExtraId={availabilityBoard.byExtraId}
          availabilityByVariantId={availabilityBoard.byVariantId}
          autoOpenExtraId={searchParams.extra}
          sie={sie}
        />
      </main>

      <Footer />
    </div>
  );
}

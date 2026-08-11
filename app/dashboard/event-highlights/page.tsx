import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { ExtrasSection } from "@/components/ExtrasSection";
import { getAvailabilityBoard } from "@/lib/availability-server";
import type { BookingExtra, Extra, ExtraVariant } from "@/lib/types";

export default async function EventHighlightsPage() {
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

  const allExtras = (extras ?? []) as Extra[];
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
            Mach dein Event noch persönlicher: Wähle besondere Extras, die für
            unvergessliche Erinnerungen und das gewisse Etwas sorgen.
          </p>
        </div>

        <ExtrasSection
          extras={allExtras}
          variantsByExtra={variantsByExtra}
          initialSelections={(selections ?? []) as BookingExtra[]}
          initialConfirmedAt={booking.extras_confirmed_at}
          availabilityByExtraId={availabilityBoard.byExtraId}
          availabilityByVariantId={availabilityBoard.byVariantId}
        />
      </main>

      <Footer />
    </div>
  );
}

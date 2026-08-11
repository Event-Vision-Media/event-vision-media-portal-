import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { LayoutProofsSection } from "@/components/LayoutProofsSection";
import type { LayoutProof } from "@/lib/types";

export default async function LayoutFreigabePage() {
  const booking = await requireBooking();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("layout_proofs")
    .select("*")
    .eq("booking_id", booking.id)
    .order("version", { ascending: false });

  const proofs = (data ?? []) as LayoutProof[];
  const groupedMap = new Map<string, LayoutProof[]>();
  proofs.forEach((proof) => {
    const list = groupedMap.get(proof.layout_name) ?? [];
    list.push(proof);
    groupedMap.set(proof.layout_name, list);
  });
  const groupedProofs = Array.from(groupedMap.entries()).map(([layoutName, versions]) => ({
    layoutName,
    versions,
  }));

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
            Layout-Freigabe
          </h1>
          <p className="mt-1 text-anthracite-500">
            Prüft eure individuell erstellten Layouts und gebt sie frei — oder
            fordert Änderungen an.
          </p>
        </div>

        <LayoutProofsSection groupedProofs={groupedProofs} />
      </main>

      <Footer />
    </div>
  );
}

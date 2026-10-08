import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewBookingForm } from "@/components/admin/NewBookingForm";
import { PackageBookingForm } from "@/components/admin/PackageBookingForm";
import { Card } from "@/components/ui/Card";
import type { Extra, ExtraVariant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({ searchParams }: { searchParams: { alt?: string } }) {
  const legacy = searchParams.alt === "1";
  const supabase = createAdminClient();
  const [{ data: extras }, { data: variants }] = await Promise.all([
    supabase
      .from("extras")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("extra_variants").select("*").order("sort_order", { ascending: true }),
  ]);

  const allExtras = (extras ?? []) as Extra[];
  const allVariants = (variants ?? []) as ExtraVariant[];
  const variantsByExtra: Record<string, ExtraVariant[]> = {};
  allVariants.forEach((variant) => {
    (variantsByExtra[variant.extra_id] ??= []).push(variant);
  });

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className={`mx-auto px-4 py-8 sm:px-6 ${legacy ? "max-w-lg" : "max-w-2xl"}`}>
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-anthracite-800">
          Neue Buchung anlegen
        </h1>
        <p className="mt-1 mb-6 text-sm text-anthracite-500">
          {legacy ? (
            <>Bestandsbuchung ohne Paket und ohne digitalen Mietvertrag. <Link href="/admin/bookings/new" className="font-medium text-gold-700">Zur Buchung mit Paket →</Link></>
          ) : (
            <>Mit Paket, Preis und digitalem Mietvertrag – wie eine Website-Anfrage. <Link href="/admin/bookings/new?alt=1" className="font-medium text-gold-700">Alte Bestandsbuchung →</Link></>
          )}
        </p>
        <Card>
          {legacy ? <NewBookingForm extras={allExtras} variantsByExtra={variantsByExtra} /> : <PackageBookingForm />}
        </Card>
      </main>
    </div>
  );
}

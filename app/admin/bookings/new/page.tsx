import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewBookingForm } from "@/components/admin/NewBookingForm";
import { Card } from "@/components/ui/Card";
import type { Extra, ExtraVariant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
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
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-6 font-serif text-2xl font-semibold text-anthracite-800">
          Neue Buchung anlegen
        </h1>
        <Card>
          <NewBookingForm extras={allExtras} variantsByExtra={variantsByExtra} />
        </Card>
      </main>
    </div>
  );
}

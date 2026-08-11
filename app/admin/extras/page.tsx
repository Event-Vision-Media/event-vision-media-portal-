import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewExtraForm } from "@/components/admin/NewExtraForm";
import { ExtraListItem } from "@/components/admin/ExtraListItem";
import { Card } from "@/components/ui/Card";
import type { Extra, ExtraVariant } from "@/lib/types";

export default async function AdminExtrasPage() {
  const supabase = createAdminClient();
  const [{ data: extras }, { data: variants }] = await Promise.all([
    supabase.from("extras").select("*").order("sort_order", { ascending: true }),
    supabase.from("extra_variants").select("*").order("sort_order", { ascending: true }),
  ]);

  const allExtras = (extras ?? []) as Extra[];
  const allVariants = (variants ?? []) as ExtraVariant[];

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">
          Exclusive Extras verwalten
        </h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Diese Extras erscheinen für Kunden im Bereich „Event Highlights“.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {allExtras.map((extra) => (
              <ExtraListItem
                key={extra.id}
                extra={extra}
                variants={allVariants.filter((v) => v.extra_id === extra.id)}
              />
            ))}
            {allExtras.length === 0 && (
              <p className="text-sm text-anthracite-400">Noch keine Extras angelegt.</p>
            )}
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
              Neues Extra
            </h2>
            <NewExtraForm />
          </Card>
        </div>
      </main>
    </div>
  );
}

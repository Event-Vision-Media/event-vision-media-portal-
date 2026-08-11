import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewLayoutForm } from "@/components/admin/NewLayoutForm";
import { LayoutListItem } from "@/components/admin/LayoutListItem";
import { Card } from "@/components/ui/Card";
import type { Layout } from "@/lib/types";

export default async function AdminLayoutsPage() {
  const supabase = createAdminClient();
  const { data: layouts } = await supabase
    .from("layouts")
    .select("*")
    .order("sort_order", { ascending: true });

  const allLayouts = (layouts ?? []) as Layout[];

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-6 font-serif text-2xl font-semibold text-anthracite-800">
          Layouts verwalten
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {allLayouts.map((layout) => (
              <LayoutListItem key={layout.id} layout={layout} />
            ))}
            {allLayouts.length === 0 && (
              <p className="text-sm text-anthracite-400">Noch keine Layouts angelegt.</p>
            )}
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
              Neues Layout
            </h2>
            <NewLayoutForm />
          </Card>
        </div>
      </main>
    </div>
  );
}

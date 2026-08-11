import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { GoogleReviewLinkForm } from "@/components/admin/GoogleReviewLinkForm";
import { Card } from "@/components/ui/Card";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_review_url")
    .maybeSingle();

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-6 font-serif text-2xl font-semibold text-anthracite-800">
          Einstellungen
        </h1>
        <Card>
          <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
            Google-Bewertung
          </h2>
          <GoogleReviewLinkForm currentUrl={setting?.value ?? null} />
        </Card>
      </main>
    </div>
  );
}

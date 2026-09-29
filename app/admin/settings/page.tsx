import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { GoogleReviewLinkForm } from "@/components/admin/GoogleReviewLinkForm";
import { Card } from "@/components/ui/Card";
import { BankDetailsForm } from "@/components/admin/BankDetailsForm";
import { BANK_SETTING_KEYS } from "@/lib/contract-server";
import { CopyField } from "@/components/admin/CopyField";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_review_url")
    .maybeSingle();
  const { data: bankRows } = await supabase.from("app_settings").select("key, value").in("key", Object.values(BANK_SETTING_KEYS));
  const bankValue = (k: string) => (bankRows ?? []).find((r) => r.key === k)?.value ?? null;
  const portal = (process.env.PORTAL_URL || "http://localhost:3000").replace(/\/$/, "");
  const feedUrl = process.env.CALENDAR_FEED_TOKEN ? `${portal}/api/calendar?token=${process.env.CALENDAR_FEED_TOKEN}` : null;

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
        <Card className="mt-6">
          <h2 className="mb-1 font-serif text-lg font-semibold text-anthracite-800">Kalender-Abo fürs Handy</h2>
          <p className="mb-4 text-sm text-anthracite-500">
            Alle Aufbau-, Event- und Abbau-Termine automatisch in deinem iPhone-, Mac- oder Google-Kalender – mit Adresse, Telefon und Erinnerung. Aktualisiert sich von selbst.
          </p>
          {feedUrl ? (
            <>
              <CopyField value={feedUrl} />
              <div className="mt-4 space-y-3 text-sm text-anthracite-600">
                <p>
                  <strong>iPhone/iPad:</strong> Link oben kopieren → Einstellungen → Apps → Kalender → Accounts → Account hinzufügen → Andere → <em>Kalenderabo hinzufügen</em> → Link einfügen → Sichern.
                  {" "}Oder direkt am iPhone:{" "}
                  <a href={feedUrl.replace(/^https?:/, "webcal:")} className="font-medium text-gold-700 underline">Kalender abonnieren</a>
                </p>
                <p>
                  <strong>Google Kalender:</strong> calendar.google.com am Computer → links bei „Weitere Kalender“ auf <em>+</em> → <em>Per URL</em> → Link einfügen. (Google aktualisiert nur alle paar Stunden.)
                </p>
                <p className="text-xs text-anthracite-400">
                  Der Link ist geheim wie ein Passwort – nicht weitergeben. Bei Bedarf kann ein neuer erzeugt werden (CALENDAR_FEED_TOKEN ändern).
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-anthracite-400">Noch nicht eingerichtet (CALENDAR_FEED_TOKEN fehlt).</p>
          )}
        </Card>
        <Card className="mt-6">
          <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
            Bankverbindung für Mietverträge
          </h2>
          <BankDetailsForm
            current={{
              holder: bankValue(BANK_SETTING_KEYS.holder),
              iban: bankValue(BANK_SETTING_KEYS.iban),
              bic: bankValue(BANK_SETTING_KEYS.bic),
              bank: bankValue(BANK_SETTING_KEYS.bank),
            }}
          />
        </Card>
      </main>
    </div>
  );
}

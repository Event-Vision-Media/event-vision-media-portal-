import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { AppointmentListItem } from "@/components/admin/AppointmentListItem";
import { Card } from "@/components/ui/Card";
import { todayBerlin, type Appointment } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** Eigene Termine außerhalb der Buchungen – stehen im Kalender, im Kalender-Abo und im Wochenplan. */
export default async function AppointmentsPage() {
  const supabase = createAdminClient();
  const today = todayBerlin();
  const [{ data: rows, error }, { data: extras }, { data: blocks }] = await Promise.all([
    supabase.from("admin_appointments").select("*").order("date", { ascending: true }),
    // Nur Extras mit Bestand lassen sich sperren (z. B. die Fotokabine)
    supabase.from("extras").select("id, name").eq("is_active", true).not("total_stock", "is", null).order("sort_order", { ascending: true }),
    supabase.from("availability_blocks").select("id, extras(name)"),
  ]);
  const all = (rows ?? []) as Appointment[];
  const upcoming = all.filter((a) => (a.return_date ?? a.date) >= today);
  const past = all.filter((a) => (a.return_date ?? a.date) < today).reverse().slice(0, 10);
  const blockName = new Map(
    ((blocks ?? []) as { id: string; extras: { name: string } | { name: string }[] | null }[]).map((b) => [
      b.id,
      (Array.isArray(b.extras) ? b.extras[0]?.name : b.extras?.name) ?? null,
    ])
  );
  const blocked = (a: Appointment) => (a.block_id ? blockName.get(a.block_id) ?? null : null);

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/kalender" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zum Kalender
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">Eigene Termine</h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Für alles außerhalb der normalen Buchungen – z. B. nur Zubehör vermietet, Wartung oder Besorgungen. Steht im Kalender, im Kalender-Abo und im Wochenplan.
        </p>

        {error && (
          <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Die Tabelle für eigene Termine fehlt noch – bitte zuerst die SQL-Datei 0030_eigene_termine.sql in Supabase ausführen.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <Card>
            <h2 className="mb-4 font-semibold text-anthracite-800">Neuer Termin</h2>
            <AppointmentForm extras={(extras ?? []) as { id: string; name: string }[]} defaultDate={today} />
          </Card>

          <div>
            <h2 className="mb-3 font-semibold text-anthracite-800">Anstehend</h2>
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-anthracite-200 px-4 py-6 text-center text-sm text-anthracite-400">Noch keine eigenen Termine.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <AppointmentListItem key={a.id} a={a} blockedName={blocked(a)} />
                ))}
              </div>
            )}
            {past.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-anthracite-500">Vergangene Termine ({past.length})</summary>
                <div className="mt-2 space-y-2 opacity-70">
                  {past.map((a) => (
                    <AppointmentListItem key={a.id} a={a} blockedName={blocked(a)} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

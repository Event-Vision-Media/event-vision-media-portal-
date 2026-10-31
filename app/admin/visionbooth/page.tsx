import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewVbEventForm } from "@/components/admin/visionbooth/NewVbEventForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateGerman } from "@/lib/format";
import { vbClosedReason, type VbEvent } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

const PACKAGE_LABELS: Record<string, string> = { privat: "Privat", business: "Business", addon: "Add-on zur Buchung" };

export default async function AdminVisionBoothPage() {
  const supabase = createAdminClient();
  const { data: events } = await supabase.from("vb_events").select("*").order("event_date", { ascending: false, nullsFirst: true });
  const list = (events ?? []) as (VbEvent & { package: string })[];
  // Zählen per count-Abfrage (Zeilen-Abfragen wären bei vielen Fotos auf 1000 begrenzt)
  const counts = await Promise.all(
    list.map(async (e) => {
      const [{ count: p }, { count: a }] = await Promise.all([
        supabase.from("vb_photos").select("id", { count: "exact", head: true }).eq("event_id", e.id),
        supabase.from("vb_ai_jobs").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("status", "fertig"),
      ]);
      return [e.id, { photos: p ?? 0, ai: a ?? 0 }] as const;
    })
  );
  const photoCount = new Map(counts.map(([id, c]) => [id, c.photos]));
  const aiCount = new Map(counts.map(([id, c]) => [id, c.ai]));

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold text-anthracite-800">VisionBooth</h1>
        <p className="mt-1 text-sm text-anthracite-500">Digitale Fotobox per QR-Code: Events anlegen, Rahmen gestalten, QR-Code drucken, Fotos verwalten.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {list.length === 0 && <p className="text-sm text-anthracite-400">Noch keine VisionBooth-Events.</p>}
            {list.map((e) => {
              const closed = vbClosedReason(e);
              return (
                <Link key={e.id} href={`/admin/visionbooth/${e.id}`} className="block">
                  <Card className="transition hover:shadow-card-hover">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-anthracite-800">{e.title}</p>
                        <p className="mt-0.5 text-xs text-anthracite-400">
                          {e.event_date ? formatDateGerman(e.event_date) : "ohne Datum"} · {PACKAGE_LABELS[e.package] ?? e.package} · Code {e.slug}
                        </p>
                      </div>
                      {closed ? <Badge tone="neutral">{e.status === "entwurf" ? "Entwurf" : e.status === "beendet" || (e.closes_at && new Date() > new Date(e.closes_at)) ? "Beendet" : "Geplant"}</Badge> : <Badge tone="success">Live</Badge>}
                    </div>
                    <p className="mt-3 text-sm text-anthracite-600">
                      📸 {photoCount.get(e.id) ?? 0} Fotos
                      {e.ai_enabled && <> · ✨ {aiCount.get(e.id) ?? 0} / {e.ai_limit} KI-Bilder</>}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">Neues Event</h2>
            <NewVbEventForm />
          </Card>
        </div>
      </main>
    </div>
  );
}

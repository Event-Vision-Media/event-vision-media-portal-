import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AvailabilityDatePicker } from "@/components/admin/AvailabilityDatePicker";
import { NewAvailabilityBlockForm } from "@/components/admin/NewAvailabilityBlockForm";
import { AvailabilityBlockListItem } from "@/components/admin/AvailabilityBlockListItem";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAvailabilityBoard } from "@/lib/availability-server";
import { formatAvailabilityLabel, type AvailabilityInfo } from "@/lib/availability";

function todayDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusTone(status: AvailabilityInfo["status"]) {
  if (status === "ausgebucht") return "danger" as const;
  if (status === "wenige") return "gold" as const;
  return "success" as const;
}

interface AvailabilityRow {
  type: "extra" | "variant";
  id: string;
  name: string;
  category: "Event Highlight" | "Hintergrund";
  availability: AvailabilityInfo;
}

export default async function AdminAvailabilityPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date || todayDateString();

  const [board, { data: allBlocks }] = await Promise.all([
    getAvailabilityBoard(date),
    (async () => {
      const supabase = createAdminClient();
      return supabase
        .from("availability_blocks")
        .select("*, extras(name), extra_variants(name, extras(name))")
        .order("start_date", { ascending: true });
    })(),
  ]);

  const hintergrundExtraId = board.extras.find((e) => e.name === "Hintergrund")?.id;

  const rows: AvailabilityRow[] = [];
  board.extras
    .filter((extra) => extra.category !== "Startbildschirm")
    .forEach((extra) => {
      if (extra.has_variants && extra.total_stock == null) {
        board.variants
          .filter((v) => v.extra_id === extra.id)
          .forEach((variant) => {
            rows.push({
              type: "variant",
              id: variant.id,
              name: extra.id === hintergrundExtraId ? variant.name : `${extra.name} – ${variant.name}`,
              category: extra.id === hintergrundExtraId ? "Hintergrund" : "Event Highlight",
              availability: board.byVariantId[variant.id],
            });
          });
      } else {
        rows.push({
          type: "extra",
          id: extra.id,
          name: extra.name,
          category: "Event Highlight",
          availability: board.byExtraId[extra.id],
        });
      }
    });

  const blockOptions = rows.map((row) => ({
    value: `${row.type}:${row.id}`,
    label: row.name,
    group: row.category,
  }));

  const blocksForDate = board.blocks;
  const blockedByRow = new Map<string, typeof blocksForDate>();
  blocksForDate.forEach((block) => {
    const key = block.extra_id ? `extra:${block.extra_id}` : `variant:${block.variant_id}`;
    const list = blockedByRow.get(key) ?? [];
    list.push(block);
    blockedByRow.set(key, list);
  });

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-1 font-serif text-2xl font-semibold text-anthracite-800">
          Verfügbarkeit Event Highlights
        </h1>
        <p className="mb-6 text-sm text-anthracite-500">
          Bestand, Buchungen und manuelle Blockierungen je Produkt für ein bestimmtes Datum.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-anthracite-600">
            Datum ansehen
          </label>
          <AvailabilityDatePicker date={date} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-anthracite-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-anthracite-100 text-sm">
            <thead className="bg-anthracite-50 text-left text-xs uppercase tracking-wide text-anthracite-400">
              <tr>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Gesamtbestand</th>
                <th className="px-4 py-3">Gebucht</th>
                <th className="px-4 py-3">Blockiert</th>
                <th className="px-4 py-3">Verfügbar</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-anthracite-50">
              {rows.map((row) => {
                const key = `${row.type}:${row.id}`;
                const rowBlocks = blockedByRow.get(key) ?? [];
                return (
                  <tr key={key} className="align-top hover:bg-anthracite-50/50">
                    <td className="px-4 py-3 font-medium text-anthracite-800">{row.name}</td>
                    <td className="px-4 py-3 text-anthracite-600">{row.category}</td>
                    <td className="px-4 py-3 text-anthracite-600">
                      {row.availability.total ?? "unbegrenzt"}
                    </td>
                    <td className="px-4 py-3 text-anthracite-600">{row.availability.booked}</td>
                    <td className="px-4 py-3 text-anthracite-600">
                      {row.availability.blocked}
                      {rowBlocks.length > 0 && (
                        <p className="mt-0.5 text-xs italic text-anthracite-400">
                          {rowBlocks
                            .map((b) => b.note || "ohne Notiz")
                            .join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-anthracite-600">
                      {row.availability.remaining ?? "unbegrenzt"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.availability.status)}>
                        {formatAvailabilityLabel(row.availability)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">
              Bestehende Blockierungen
            </h2>
            {(allBlocks ?? []).length === 0 && (
              <p className="text-sm text-anthracite-400">Keine manuellen Blockierungen angelegt.</p>
            )}
            {(allBlocks ?? []).map((block: any) => (
              <AvailabilityBlockListItem
                key={block.id}
                blockId={block.id}
                productName={
                  block.extras?.name ??
                  (block.extra_variants?.extras?.name === "Hintergrund"
                    ? block.extra_variants?.name
                    : `${block.extra_variants?.extras?.name ?? ""} – ${block.extra_variants?.name ?? ""}`)
                }
                startDate={block.start_date}
                endDate={block.end_date}
                blockedQuantity={block.blocked_quantity}
                note={block.note}
              />
            ))}
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
              Neue Blockierung
            </h2>
            <NewAvailabilityBlockForm options={blockOptions} defaultDate={date} />
          </Card>
        </div>
      </main>
    </div>
  );
}

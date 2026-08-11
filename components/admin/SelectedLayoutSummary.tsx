import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR, formatDateGerman } from "@/lib/format";

export function SelectedLayoutSummary({
  layout,
  isPremiumSelected,
  premiumIncluded,
  personalizationName,
  personalizationDate,
  extraWishes,
}: {
  layout: { name: string; preview_image_url: string; extra_price: number } | null;
  isPremiumSelected: boolean;
  premiumIncluded: boolean;
  personalizationName: string | null;
  personalizationDate: string | null;
  extraWishes: string | null;
}) {
  if (!layout) {
    return (
      <div className="rounded-2xl border border-dashed border-anthracite-200 bg-white p-4 text-sm text-anthracite-400">
        Der Kunde hat noch kein Layout ausgewählt.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-soft">
      <h3 className="mb-3 font-medium text-anthracite-800">Ausgewähltes Layout</h3>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-[3/2] w-full flex-none overflow-hidden rounded-lg bg-anthracite-50 sm:w-28">
          <Image
            src={layout.preview_image_url}
            alt={layout.name}
            fill
            sizes="(max-width: 640px) 100vw, 112px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-anthracite-800">{layout.name}</p>
            {isPremiumSelected && (
              <Badge tone="gold">
                Premium ·{" "}
                {premiumIncluded ? "inklusive" : `+${formatCurrencyEUR(layout.extra_price)}`}
              </Badge>
            )}
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 flex-none text-anthracite-400">Name(n)</dt>
              <dd className="text-anthracite-700">{personalizationName || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 flex-none text-anthracite-400">Datum</dt>
              <dd className="text-anthracite-700">
                {personalizationDate ? formatDateGerman(personalizationDate) : "—"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 flex-none text-anthracite-400">Zusatzwunsch</dt>
              <dd className="text-anthracite-700">{extraWishes || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

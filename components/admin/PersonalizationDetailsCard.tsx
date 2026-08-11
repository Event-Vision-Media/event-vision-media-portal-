import Image from "next/image";
import { formatDateGerman, formatDateTimeGerman } from "@/lib/format";
import type { PersonalizedScreenRequest } from "@/lib/types";

export function PersonalizationDetailsCard({
  request,
}: {
  request: PersonalizedScreenRequest | null;
}) {
  if (!request) {
    return (
      <div className="rounded-2xl border border-dashed border-anthracite-200 bg-white p-4 text-sm text-anthracite-400">
        Der Kunde hat noch keine Angaben für den personalisierten Startbildschirm hinterlegt.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-soft">
      <h3 className="mb-3 font-medium text-anthracite-800">Angaben des Kunden</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <dl className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 flex-none text-anthracite-400">Name</dt>
            <dd className="text-anthracite-700">{request.personalization_name || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 flex-none text-anthracite-400">Datum</dt>
            <dd className="text-anthracite-700">
              {request.personalization_date ? formatDateGerman(request.personalization_date) : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 flex-none text-anthracite-400">Wunschtext</dt>
            <dd className="text-anthracite-700">{request.wish_text || "—"}</dd>
          </div>
        </dl>

        {request.photo_url && (
          <div className="flex-none">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-anthracite-50">
              <Image src={request.photo_url} alt="Vom Kunden hochgeladenes Bild" fill className="object-cover" />
            </div>
            <a
              href={request.photo_url}
              download
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-center text-xs font-medium text-anthracite-500 underline hover:text-anthracite-800"
            >
              Herunterladen
            </a>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-anthracite-400">
        Zuletzt aktualisiert am {formatDateTimeGerman(request.updated_at)} Uhr
      </p>
    </div>
  );
}

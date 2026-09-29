import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CountersignButton } from "@/components/admin/CountersignButton";
import { formatDateTimeGerman } from "@/lib/format";
import type { SignedContract } from "@/lib/contract-server";

/** Mietvertrag in den Buchungsdetails (Admin). */
export function ContractAdminCard({ bookingId, contract, required }: { bookingId: string; contract: SignedContract | null; required: boolean }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">Mietvertrag</h2>
        {contract?.countersigned_at ? (
          <Badge tone="success">Gegengezeichnet</Badge>
        ) : contract ? (
          <Badge tone="gold">Unterschrieben</Badge>
        ) : required ? (
          <Badge tone="neutral">Offen</Badge>
        ) : (
          <Badge tone="neutral">Papiervertrag</Badge>
        )}
      </div>

      {!contract ? (
        !required ? (
          <p className="text-sm text-anthracite-500">
            Im Admin angelegte Buchung – der Mietvertrag läuft hier wie bisher auf Papier. Den digitalen Vertrag
            erhalten automatisch alle Buchungen über die Website.
          </p>
        ) : (
        <p className="text-sm text-anthracite-500">
          Der Kunde hat den Vertrag noch nicht unterschrieben. Er wird im Kundenportal automatisch passend zur Buchung
          erstellt und erscheint dort ganz oben.
        </p>
        )
      ) : (
        <div className="space-y-4 text-sm">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Row k="Mieter" v={[contract.renter_company, contract.renter_name].filter(Boolean).join(" · ")} />
            <Row k="Anschrift" v={`${contract.renter_street}, ${contract.renter_zip_city}`} />
            <Row k="Location" v={[contract.location_name, contract.location_street, contract.location_zip_city].filter(Boolean).join(", ")} />
            <Row k="Vor Ort" v={[contract.onsite_contact_name, contract.onsite_contact_phone].filter(Boolean).join(" · ")} />
            <Row k="Lieferung" v={contract.handover_window} />
            <Row k="Abholung" v={contract.return_window} />
            <Row k="Unterschrift" v={`${contract.signer_name} · ${formatDateTimeGerman(contract.signed_at)}`} />
            <Row k="Version" v={contract.template_version} />
          </dl>
          <div className="flex flex-wrap gap-2 text-xs">
            {contract.reference_consent ? <Badge tone="success">Referenzfotos erlaubt</Badge> : <Badge tone="neutral">Keine Referenzfotos</Badge>}
            {contract.early_start_requested && <Badge tone="neutral">Vorzeitiger Beginn verlangt</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-anthracite-100 pt-4">
            {!contract.countersigned_at && <CountersignButton bookingId={bookingId} />}
            <Link href={`/admin/bookings/${bookingId}/vertrag`} className="text-sm font-medium text-gold-700 hover:text-gold-800">
              Vertrag ansehen / drucken →
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none text-anthracite-400">{k}</dt>
      <dd className="text-anthracite-700">{v}</dd>
    </div>
  );
}

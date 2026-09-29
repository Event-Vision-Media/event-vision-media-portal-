import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { ContractDocument } from "@/components/ContractDocument";
import { SignatureBlock } from "@/components/ContractSignatureBlock";
import { PrintButton } from "@/components/PrintButton";
import { getLatestContract } from "@/lib/contract-server";

export const dynamic = "force-dynamic";

export default async function AdminContractPage({ params }: { params: { id: string } }) {
  const contract = await getLatestContract(params.id);
  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="print-hidden flex items-center justify-between">
          <Link href={`/admin/bookings/${params.id}`} className="text-sm text-anthracite-400 hover:text-anthracite-700">
            ← Zurück zur Buchung
          </Link>
          {contract && <PrintButton />}
        </div>
        {!contract ? (
          <Card><p className="text-sm text-anthracite-400">Noch kein unterschriebener Vertrag vorhanden.</p></Card>
        ) : (
          <Card>
            <ContractDocument doc={contract.snapshot}>
              <SignatureBlock
                signerName={contract.signer_name}
                signedAt={contract.signed_at}
                signaturePng={contract.signature_png}
                countersignedAt={contract.countersigned_at}
                earlyStart={contract.early_start_requested}
              />
              <p className="mt-4 text-[11px] text-anthracite-400">
                Nachweis: IP {contract.signed_ip ?? "–"} · {contract.signed_user_agent ?? "–"} · SHA-256 {contract.snapshot_sha256.slice(0, 16)}…
              </p>
            </ContractDocument>
          </Card>
        )}
      </main>
    </div>
  );
}

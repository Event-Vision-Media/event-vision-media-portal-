import { planSlots } from "@/lib/slots";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contractRequired } from "@/lib/contract";
import { requireBooking } from "@/lib/booking-session";
import { buildContractFor, getLatestContract } from "@/lib/contract-server";
import { formatDateTimeGerman } from "@/lib/format";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ContractDocument } from "@/components/ContractDocument";
import { ContractSignForm } from "@/components/ContractSignForm";
import { PrintButton } from "@/components/PrintButton";
import { SignatureBlock } from "@/components/ContractSignatureBlock";

export const dynamic = "force-dynamic";

export default async function ContractPage() {
  const booking = await requireBooking();
  const sie = booking.customer_type === "business";
  const t = (du: string, s: string) => (sie ? s : du);
  const signed = await getLatestContract(booking.id);
  if (!signed && !contractRequired(booking)) redirect("/dashboard");

  if (signed) {
    return (
      <div className="min-h-screen">
        <GuestHeader bookingCode={booking.booking_code} />
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
          <Link href="/dashboard" className="print-hidden text-sm text-anthracite-400 hover:text-anthracite-700">
            ← Zurück zum Dashboard
          </Link>

          <div className="print-hidden animate-fade-in-up rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg font-semibold text-anthracite-800">
                  {signed.countersigned_at
                    ? t("Euer Vertrag ist abgeschlossen ✓", "Ihr Vertrag ist abgeschlossen ✓")
                    : t("Euer Vertrag ist unterschrieben ✓", "Ihr Vertrag ist unterschrieben ✓")}
                </p>
                <p className="mt-1 text-sm text-anthracite-600">
                  {signed.countersigned_at
                    ? t(
                        `Abgeschlossen am ${formatDateTimeGerman(signed.countersigned_at)}. Die Rechnung über die Anzahlung bekommt ihr in Kürze per E-Mail – alles Weitere seht ihr im Dashboard.`,
                        `Abgeschlossen am ${formatDateTimeGerman(signed.countersigned_at)}. Die Rechnung über die Anzahlung erhalten Sie in Kürze per E-Mail – alles Weitere sehen Sie im Dashboard.`
                      )
                    : t(
                        "Wir prüfen ihn und schicken euch dann die Rechnung über die Anzahlung.",
                        "Wir zeichnen ihn in Kürze gegen und senden Ihnen dann die Rechnung über die Anzahlung."
                      )}
                </p>
              </div>
              <Badge tone={signed.countersigned_at ? "success" : "gold"}>
                {signed.countersigned_at ? "Abgeschlossen" : "Unterschrieben"}
              </Badge>
            </div>
            <div className="mt-4">
              <PrintButton />
            </div>
          </div>

          <Card>
            <ContractDocument doc={signed.snapshot}>
              <SignatureBlock
                signerName={signed.signer_name}
                signedAt={signed.signed_at}
                signaturePng={signed.signature_png}
                countersignedAt={signed.countersigned_at}
                earlyStart={signed.early_start_requested}
              />
            </ContractDocument>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const doc = await buildContractFor(booking);
  const hasDelivery = doc.hasDelivery;
  const slots = planSlots({ ...booking, pickup: booking.inquiry_items?.pickup ?? null, delivered: hasDelivery });

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zum Dashboard
        </Link>

        <div className="animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">Mietvertrag</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-anthracite-800 sm:text-3xl">
            {t("Euer Mietvertrag – in 2 Minuten erledigt", "Ihr Mietvertrag – in 2 Minuten erledigt")}
          </h1>
          <p className="mt-2 text-anthracite-500">
            {t(
              "Wir haben alles aus eurer Buchung bereits eingetragen. Prüft kurz den Vertrag, ergänzt Anschrift und Location und unterschreibt direkt hier – ganz ohne Drucken und Scannen.",
              "Wir haben alle Angaben aus Ihrer Buchung bereits eingetragen. Prüfen Sie kurz den Vertrag, ergänzen Sie Anschrift und Location und unterschreiben Sie direkt hier – ohne Drucken und Scannen."
            )}
          </p>
        </div>

        <Card className="animate-fade-in-up">
          <div className="max-h-[32rem] overflow-y-auto pr-2">
            <ContractDocument doc={doc} />
          </div>
          <p className="mt-3 border-t border-anthracite-100 pt-3 text-xs text-anthracite-400">
            {t("Scrollt durch den Vertrag, um alles zu lesen. ", "Scrollen Sie durch den Vertrag, um alles zu lesen. ")}
            {t("Eure Angaben unten werden automatisch in den Vertrag übernommen.", "Ihre Angaben unten werden automatisch in den Vertrag übernommen.")}
          </p>
        </Card>

        <Card className="animate-fade-in-up">
          <ContractSignForm
            sie={sie}
            isBusiness={doc.isBusiness}
            hasDelivery={hasDelivery}
            carryHelper={hasDelivery && booking.inquiry_items?.access?.help === "helfer"}
            slots={slots}
            prefill={{
              renter_name: booking.customer_name || booking.couple_names,
              renter_company: booking.company ?? "",
              location_name: booking.location ?? "",
              onsite_contact_name: booking.delivery_contact_name ?? booking.customer_name ?? "",
              onsite_contact_phone: booking.delivery_contact_phone ?? booking.phone ?? "",
            }}
          />
        </Card>
      </main>
      <Footer />
    </div>
  );
}

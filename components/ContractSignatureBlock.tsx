import { formatDateTimeGerman } from "@/lib/format";

/** Unterschriften von Mieter und Vermieter unter dem Vertrag. */
export function SignatureBlock({
  signerName,
  signedAt,
  signaturePng,
  countersignedAt,
  earlyStart,
}: {
  signerName: string;
  signedAt: string;
  signaturePng: string;
  countersignedAt: string | null;
  earlyStart: boolean;
}) {
  return (
    <section className="mt-6 grid gap-6 border-t border-anthracite-100 pt-5 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-anthracite-400">Mieter</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signaturePng} alt={`Unterschrift ${signerName}`} className="mt-1 h-20 w-auto" />
        <p className="border-t border-anthracite-200 pt-1 text-xs text-anthracite-500">
          {signerName} · digital unterschrieben am {formatDateTimeGerman(signedAt)}
        </p>
        {earlyStart && (
          <p className="mt-1 text-xs text-anthracite-400">Beginn der Leistung vor Ablauf der Widerrufsfrist ausdrücklich verlangt.</p>
        )}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-anthracite-400">Vermieter</p>
        <p className="mt-1 flex h-20 items-end font-serif text-lg italic text-anthracite-700">
          {countersignedAt ? "Dustin Nowitzki" : ""}
        </p>
        <p className="border-t border-anthracite-200 pt-1 text-xs text-anthracite-500">
          {countersignedAt ? `Buchung bestätigt · Vertrag geschlossen am ${formatDateTimeGerman(countersignedAt)}` : "Bestätigung ausstehend"}
        </p>
      </div>
    </section>
  );
}

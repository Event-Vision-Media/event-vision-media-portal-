import type { Metadata } from "next";
import { LegalPage } from "@/components/visionbooth/site/LegalPage";
import { VB_LEGAL_VERSION, VB_WIDERRUF, VB_WIDERRUF_FORM } from "@/lib/vb-legal";

export const metadata: Metadata = { title: "Widerrufsbelehrung – VisionBooth", robots: { index: true, follow: true } };

// ENTWURF – vor dem öffentlichen Verkauf anwaltlich prüfen lassen (Text in lib/vb-legal.ts).
export default function VisionBoothWithdrawalPage() {
  const [title, hint, ...lines] = VB_WIDERRUF_FORM;
  return (
    <LegalPage title="Widerrufsbelehrung" intro="für Verbraucher" sections={VB_WIDERRUF} version={VB_LEGAL_VERSION}>
      <section className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 print:ring-black/20">
        <h2 className="text-lg font-bold text-white print:text-black">{title}</h2>
        <p className="mt-1 text-sm text-white/60 print:text-black">{hint}</p>
        <div className="mt-3 space-y-3">
          {lines.map((l) => (
            <p key={l} className="border-b border-dashed border-white/15 pb-2 print:border-black/30">{l}</p>
          ))}
        </div>
      </section>
    </LegalPage>
  );
}

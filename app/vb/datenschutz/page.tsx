import type { Metadata } from "next";
import { LegalPage } from "@/components/visionbooth/site/LegalPage";
import { VB_DATENSCHUTZ, VB_LEGAL_VERSION } from "@/lib/vb-legal";

export const metadata: Metadata = { title: "Datenschutz – VisionBooth" };

// ENTWURF – vor dem öffentlichen Verkauf anwaltlich prüfen lassen (Text in lib/vb-legal.ts).
export default function VisionBoothPrivacyPolicyPage() {
  return <LegalPage title="Datenschutzerklärung" intro="für Website, Buchung und Kundenbereich von VisionBooth" sections={VB_DATENSCHUTZ} version={VB_LEGAL_VERSION} />;
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/visionbooth/site/LegalPage";
import { VB_AGB, VB_LEGAL_VERSION } from "@/lib/vb-legal";

export const metadata: Metadata = { title: "AGB – VisionBooth", robots: { index: true, follow: true } };

// ENTWURF – vor dem öffentlichen Verkauf anwaltlich prüfen lassen (Text in lib/vb-legal.ts).
export default function VisionBoothTermsPage() {
  return <LegalPage title="Allgemeine Geschäftsbedingungen" intro="für die digitale Fotobox VisionBooth" sections={VB_AGB} version={VB_LEGAL_VERSION} />;
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/visionbooth/site/LegalPage";
import { VB_IMPRESSUM, VB_LEGAL_VERSION } from "@/lib/vb-legal";

export const metadata: Metadata = { title: "Impressum – VisionBooth" };

export default function VisionBoothImprintPage() {
  return <LegalPage title="Impressum" sections={VB_IMPRESSUM} version={VB_LEGAL_VERSION} />;
}

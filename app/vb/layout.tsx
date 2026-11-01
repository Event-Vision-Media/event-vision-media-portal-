import "@/components/visionbooth/booth.css";
import { vbFontVars } from "@/components/visionbooth/fonts";

// Eigene Schriften nur für VisionBooth (Gäste-App, Wand, Galerie) – das Portal bleibt unverändert.
export default function VisionBoothLayout({ children }: { children: React.ReactNode }) {
  return <div className={vbFontVars}>{children}</div>;
}

import "@/components/visionbooth/booth.css";
import type { Metadata } from "next";
import { vbFontVars } from "@/components/visionbooth/fonts";

// Eigenes Browser-Tab- und Home-Bildschirm-Symbol für alle VisionBooth-Seiten
export const metadata: Metadata = { icons: { icon: "/visionbooth/favicon-64.png", apple: "/visionbooth/apple-touch-icon.png" } };

// Eigene Schriften nur für VisionBooth (Gäste-App, Wand, Galerie) – das Portal bleibt unverändert.
export default function VisionBoothLayout({ children }: { children: React.ReactNode }) {
  return <div className={vbFontVars}>{children}</div>;
}

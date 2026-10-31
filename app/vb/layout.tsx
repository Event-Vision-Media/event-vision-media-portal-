import { Manrope, Playfair_Display } from "next/font/google";
import "@/components/visionbooth/booth.css";

// Eigene Schriften nur für VisionBooth (Gäste-App, Wand, Galerie) – das Portal bleibt unverändert.
const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--vb-font-display", display: "swap" });
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--vb-font-ui", display: "swap" });

export default function VisionBoothLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${ui.variable}`}>{children}</div>;
}

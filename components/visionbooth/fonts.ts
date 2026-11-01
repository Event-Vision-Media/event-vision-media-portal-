import { Caveat, Great_Vibes, Manrope, Playfair_Display } from "next/font/google";

// Schriften der VisionBooth-Vorlagen (Gäste-App, Wand, Galerie und Vorschau im Admin).
// Als CSS-Variablen gesetzt; frame.ts liest sie fürs Canvas aus (loadVbFonts).
const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--vb-font-display", display: "swap" });
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--vb-font-ui", display: "swap" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--vb-font-script", display: "swap" });
const hand = Caveat({ subsets: ["latin"], weight: ["500", "600"], variable: "--vb-font-hand", display: "swap" });

export const vbFontVars = `${display.variable} ${ui.variable} ${script.variable} ${hand.variable}`;

import localFont from "next/font/local";

// Schriften der VisionBooth-Vorlagen (Gäste-App, Wand, Galerie und Vorschau im Admin).
// Liegen im Projekt (OFL, latin inkl. Umlaute) – der Build braucht kein Google Fonts,
// und Gäste-Handys verbinden sich nie mit Google. Als CSS-Variablen gesetzt;
// frame.ts liest sie fürs Canvas aus (loadVbFonts).
const display = localFont({
  src: [
    { path: "./fonts/playfair-500-700.woff2", weight: "500 700", style: "normal" },
    { path: "./fonts/playfair-italic-500.woff2", weight: "500", style: "italic" },
  ],
  variable: "--vb-font-display",
  display: "swap",
});
const ui = localFont({ src: "./fonts/manrope-400-800.woff2", weight: "400 800", variable: "--vb-font-ui", display: "swap" });
const script = localFont({ src: "./fonts/great-vibes-400.woff2", weight: "400", variable: "--vb-font-script", display: "swap" });
const hand = localFont({ src: "./fonts/caveat-500-600.woff2", weight: "500 600", variable: "--vb-font-hand", display: "swap" });

export const vbFontVars = `${display.variable} ${ui.variable} ${script.variable} ${hand.variable}`;

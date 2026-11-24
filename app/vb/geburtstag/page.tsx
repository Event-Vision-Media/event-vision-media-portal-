import type { Viewport } from "next";
import { AnlassView, anlassMetadata } from "@/components/visionbooth/site/AnlassView";
import { ANLASS_PAGES } from "@/components/visionbooth/site/anlass-pages";

const page = ANLASS_PAGES.geburtstag;

export const metadata = anlassMetadata(page);
// Aktionspreise (z. B. Black Week) wechseln zeitgesteuert – Seite alle 5 Minuten neu erzeugen
export const revalidate = 300;
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

export default function Page() {
  return <AnlassView page={page} />;
}

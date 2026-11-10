import type { Viewport } from "next";
import { AnlassView, anlassMetadata } from "@/components/visionbooth/site/AnlassView";
import { ANLASS_PAGES } from "@/components/visionbooth/site/anlass-pages";

const page = ANLASS_PAGES.geburtstag;

export const metadata = anlassMetadata(page);
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

export default function Page() {
  return <AnlassView page={page} />;
}

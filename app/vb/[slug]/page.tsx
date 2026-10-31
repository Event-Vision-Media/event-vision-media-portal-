import type { Metadata, Viewport } from "next";
import { loadVbEvent, toGuestEvent, vbClosedReason } from "@/lib/visionbooth";
import { GuestBooth } from "@/components/visionbooth/GuestBooth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VisionBooth – Fotobox im Browser",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0d0f",
  viewportFit: "cover",
};

export default async function VisionBoothGuestPage({ params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  const closed = event ? vbClosedReason(event) : "Diese Fotobox gibt es nicht. Bitte prüfe den QR-Code.";

  if (!event || closed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0d0f] px-6 text-center text-white">
        <p className="font-serif text-3xl text-gold-300">VisionBooth</p>
        <p className="mt-4 max-w-xs text-sm text-white/70">{closed}</p>
      </main>
    );
  }

  return <GuestBooth event={await toGuestEvent(event)} />;
}

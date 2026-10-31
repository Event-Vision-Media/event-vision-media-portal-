import type { Metadata } from "next";
import QRCode from "qrcode";
import { loadVbEvent, toGuestEvent, vbGuestUrl } from "@/lib/visionbooth";
import { LiveWall } from "@/components/visionbooth/LiveWall";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VisionBooth – Foto-Wand",
  robots: { index: false, follow: false },
};

/** Foto-Wand für Beamer/TV: neue Fotos erscheinen automatisch, daneben der QR-Code zum Mitmachen. */
export default async function VisionBoothWallPage({ params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || !event.wall_enabled || event.status === "entwurf") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d0d0f] text-white/70">
        Diese Foto-Wand ist nicht verfügbar.
      </main>
    );
  }
  const guestUrl = vbGuestUrl(event.slug);
  const qr = await QRCode.toString(guestUrl, { type: "svg", margin: 1, color: { dark: "#0d0d0f", light: "#ffffff" } });

  return <LiveWall event={await toGuestEvent(event)} qrSvg={qr} guestUrl={guestUrl.replace(/^https?:\/\//, "")} />;
}

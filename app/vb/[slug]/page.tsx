import type { Metadata, Viewport } from "next";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { loadVbEvent, toGuestEvent, vbClosedReason, vbProbeKey } from "@/lib/visionbooth";
import { GuestBooth } from "@/components/visionbooth/GuestBooth";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  return {
    title: "VisionBooth – Fotobox im Browser",
    robots: { index: false, follow: false },
    // „Als App speichern“: eigenes Manifest je Event, iPhone-Symbol und Vollbild
    manifest: `/api/vb/${slug.toLowerCase()}/manifest`,
    appleWebApp: { capable: true, title: "Fotobox", statusBarStyle: "black-translucent" },
    icons: { apple: "/visionbooth/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0d0f",
  viewportFit: "cover",
};

export default async function VisionBoothGuestPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ probe?: string }> }) {
  const params = await props.params;
  const sp = await props.searchParams;
  const event = await loadVbEvent(params.slug.toLowerCase());
  // Probefoto für den Gastgeber (Link aus dem Kundenbereich): schon vor dem Event, ohne Speichern und ohne KI
  const probe = Boolean(event && sp.probe && sp.probe === vbProbeKey(event.manage_token) && event.status !== "entwurf" && !event.photos_deleted_at);
  const closed = event ? (probe ? null : vbClosedReason(event)) : "Diese Fotobox gibt es nicht. Bitte prüfe den QR-Code.";

  if (!event || closed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0d0f] px-6 text-center text-white">
        <VbLogo variant="logo" height={110} />
        <p className="mt-4 max-w-xs text-sm text-white/70">{closed}</p>
      </main>
    );
  }

  const guest = await toGuestEvent(event);
  return <GuestBooth event={probe ? { ...guest, aiStyles: [], galleryEnabled: false, leads: null, challenges: [], reveal: null, probe: true } : guest} />;
}

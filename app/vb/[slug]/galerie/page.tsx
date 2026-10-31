import type { Metadata, Viewport } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVbEvent, toGuestEvent } from "@/lib/visionbooth";
import { Gallery } from "@/components/visionbooth/Gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VisionBooth – Galerie",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d0d0f" };

/** Event-Galerie: alle freigegebenen Fotos ansehen, einzeln oder gesammelt herunterladen. */
export default async function VisionBoothGalleryPage({ params }: { params: { slug: string } }) {
  const event = await loadVbEvent(params.slug.toLowerCase());
  if (!event || !event.gallery_enabled || event.status === "entwurf") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0d0f] px-6 text-center text-white">
        <p className="font-serif text-3xl text-gold-300">VisionBooth</p>
        <p className="mt-4 max-w-xs text-sm text-white/70">Diese Galerie ist nicht verfügbar.</p>
      </main>
    );
  }
  const { count } = await createAdminClient()
    .from("vb_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("hidden", false);

  const g = await toGuestEvent(event);
  return <Gallery event={{ slug: g.slug, frameText: g.frameText, accent: g.accent, logoUrl: g.logoUrl }} total={count ?? 0} />;
}

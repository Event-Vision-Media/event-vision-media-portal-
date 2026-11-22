import { NextResponse } from "next/server";
import { loadVbEvent } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/** Web-App-Manifest für die Gäste-Seite: „Als App speichern“ – Icon mit Event-Namen, öffnet direkt die Fotobox. */
export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await loadVbEvent(slug.toLowerCase());
  if (!event) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  const name = (event.frame_text || event.title).slice(0, 40);
  const start = `/vb/${event.slug}`;
  return NextResponse.json(
    {
      id: start,
      name: `${name} – Fotobox`,
      short_name: name.length > 14 ? "Fotobox" : name,
      description: "Fotos machen, mit KI verwandeln und teilen – die Fotobox für dieses Event.",
      start_url: start,
      scope: start,
      display: "standalone",
      orientation: "portrait",
      background_color: "#0d0d0f",
      theme_color: "#0d0d0f",
      icons: [
        { src: "/visionbooth/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/visionbooth/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/visionbooth/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "no-store" } }
  );
}

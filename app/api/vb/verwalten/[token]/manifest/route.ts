import { NextResponse } from "next/server";
import { loadVbEventByToken } from "@/lib/visionbooth";

export const dynamic = "force-dynamic";

/** App-Steckbrief (Web-App-Manifest) für den Kundenbereich – Name des Events unter dem App-Symbol. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const event = await loadVbEventByToken(params.token);
  if (!event) return NextResponse.json({ error: "nicht gefunden" }, { status: 404 });
  const name = (event.frame_text || event.title).slice(0, 40);
  const start = `/vb/verwalten/${params.token}`;
  return NextResponse.json(
    {
      id: start,
      name: `${name} – VisionBooth`,
      short_name: name.length > 14 ? "VisionBooth" : name,
      description: "Eure VisionBooth: gestalten, QR-Code, Galerie und Spiele.",
      start_url: start,
      scope: start,
      display: "standalone",
      orientation: "portrait",
      background_color: "#0a0a0c",
      theme_color: "#0a0a0c",
      icons: [
        { src: "/visionbooth/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/visionbooth/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/visionbooth/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "no-store" } }
  );
}

import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const VB_HOSTS = new Set(["visionbooth.de", "www.visionbooth.de"]);

/** Öffentliche Seiten von visionbooth.de für Suchmaschinen (Gäste-Events und Kundenbereiche bewusst nicht). */
const VB_SITEMAP: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/hochzeit", priority: "0.9", changefreq: "monthly" },
  { path: "/geburtstag", priority: "0.9", changefreq: "monthly" },
  { path: "/firmenfeier", priority: "0.9", changefreq: "monthly" },
  { path: "/kindergeburtstag", priority: "0.9", changefreq: "monthly" },
];

export async function GET() {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  if (!VB_HOSTS.has(host)) return new Response("Not found", { status: 404 });
  const today = new Date().toISOString().slice(0, 10);
  const urls = VB_SITEMAP.map(
    (u) => `  <url><loc>https://visionbooth.de${u.path === "/" ? "/" : u.path}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  ).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

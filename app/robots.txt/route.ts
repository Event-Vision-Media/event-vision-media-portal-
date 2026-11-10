import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const VB_HOSTS = new Set(["visionbooth.de", "www.visionbooth.de"]);

/**
 * robots.txt je Domain: visionbooth.de soll bei Google gefunden werden (ohne private Bereiche),
 * das Kundenportal nicht.
 */
export async function GET() {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  const body = VB_HOSTS.has(host)
    ? ["User-agent: *", "Allow: /", "Disallow: /vb/verwalten/", "Disallow: /api/", "", "Sitemap: https://visionbooth.de/sitemap.xml", ""].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

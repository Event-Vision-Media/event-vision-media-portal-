import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Eigene Domain für VisionBooth (visionbooth.de): Startseite = VisionBooth-Website,
// VisionBooth-Seiten, -Schnittstellen und Dateien laufen direkt. Alles andere (Admin,
// Kundenportal) gehört zum Portal und wird dorthin weitergeleitet.
const VB_HOSTS = new Set(["visionbooth.de"]);
const PORTAL = "https://portal.fotobox-essen.com";
const VB_PATHS = /^\/(vb(\/|$)|api\/vb\/|_next\/|visionbooth\/|vb-sw\.js$|favicon|robots\.txt$)/;

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (VB_HOSTS.has(host)) {
    const { pathname, search } = request.nextUrl;
    if (pathname === "/") return NextResponse.rewrite(new URL(`/vb${search}`, request.url));
    if (!VB_PATHS.test(pathname)) return NextResponse.redirect(`${PORTAL}${pathname}${search}`, 308);
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/admin")) return updateSession(request);
  return NextResponse.next();
}

export const config = {
  // Admin (Anmeldung prüfen) und alle Seiten unter visionbooth.de – statische Build-Dateien ausgenommen
  matcher: ["/((?!_next/static|_next/image).*)"],
};

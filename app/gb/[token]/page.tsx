import type { Metadata, Viewport } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestbookDial } from "@/components/GuestbookDial";
import { vbFontVars } from "@/components/visionbooth/fonts";
import { gameCategories, gameTitle } from "@/lib/guestbook-game";
import { bookedExtraNamesFor, gameAccess, gameConfig, type GuestbookGameRow } from "@/lib/guestbook-game-server";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audiogästebuch – Lass dich inspirieren", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#17181c", width: "device-width", initialScale: 1, viewportFit: "cover" };

const PAGE_BG = "radial-gradient(120% 70% at 50% 0%, #23242b 0%, #17181c 60%) fixed, #17181c";

/** Öffentliche Spielseite für die Gäste (QR-Code am Audiogästebuch) – ohne Anmeldung, ohne Gästedaten. */
export default async function GuestbookGamePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const supabase = createAdminClient();
  const { data: game } = await supabase.from("guestbook_games").select("*").eq("token", token).maybeSingle();
  const { data: booking } = game
    ? await supabase.from("bookings").select("id, product_type, inquiry_items").eq("id", (game as GuestbookGameRow).booking_id).maybeSingle()
    : { data: null };
  const active = game && booking ? gameAccess(booking as Booking, await bookedExtraNamesFor(booking.id), game as GuestbookGameRow).active : false;

  return (
    <div className={vbFontVars} style={{ minHeight: "100dvh", background: PAGE_BG, paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
      <main style={{ maxWidth: 440, margin: "0 auto", paddingTop: "max(20px, env(safe-area-inset-top))", paddingBottom: "max(36px, env(safe-area-inset-bottom))" }}>
        {active ? (
          <GuestbookDial
            title={gameTitle(gameConfig(game as GuestbookGameRow))}
            categories={gameCategories(gameConfig(game as GuestbookGameRow))}
            spinUrl={`/api/gb/${encodeURIComponent(token)}/spin`}
          />
        ) : (
          <div style={{ color: "#f1e8d6", fontFamily: "var(--vb-font-ui), system-ui, sans-serif", textAlign: "center", paddingTop: "18vh" }}>
            <p style={{ fontFamily: "var(--vb-font-display), Georgia, serif", fontSize: 26, margin: 0 }}>Audiogästebuch</p>
            <p style={{ color: "#9a958c", marginTop: 12, lineHeight: 1.5 }}>
              Dieses Gästebuch-Spiel ist gerade nicht aktiv.
              <br />
              Einfach den Hörer abheben und nach dem Piep losreden!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

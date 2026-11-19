import { redirect } from "next/navigation";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { GuestbookGameCard } from "@/components/GuestbookGameCard";
import { gameTitle } from "@/lib/guestbook-game";
import { bookedExtraNamesFor, ensureGame, gameAccess, gameConfig, gameUrl } from "@/lib/guestbook-game-server";

export const dynamic = "force-dynamic";

export default async function GuestbookGameCardPage() {
  const booking = await requireBooking();
  const game = await ensureGame(booking);
  if (!game || !gameAccess(booking, await bookedExtraNamesFor(booking.id), game).active) redirect("/dashboard/audiogaestebuch");
  // Einmal vermerken: Kunde hat die Druckvorlage geöffnet (dann entfällt die Erinnerungs-Mail)
  const { count } = await createAdminClient().from("activity_log").select("id", { count: "exact", head: true }).eq("booking_id", booking.id).eq("event_type", "spielkarte_geoeffnet");
  if (!count) await logActivity(booking.id, "spielkarte_geoeffnet", "Kunde hat den QR-Aufsteller fürs Gästebuch-Spiel geöffnet.");
  return <GuestbookGameCard title={gameTitle(gameConfig(game))} url={gameUrl(game.token)} backHref="/dashboard/audiogaestebuch" backLabel="Zurück zum Audiogästebuch" />;
}

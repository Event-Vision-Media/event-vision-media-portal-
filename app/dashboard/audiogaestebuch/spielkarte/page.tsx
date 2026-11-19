import { redirect } from "next/navigation";
import { requireBooking } from "@/lib/booking-session";
import { GuestbookGameCard } from "@/components/GuestbookGameCard";
import { gameTitle } from "@/lib/guestbook-game";
import { bookedExtraNamesFor, ensureGame, gameAccess, gameConfig, gameUrl } from "@/lib/guestbook-game-server";

export const dynamic = "force-dynamic";

export default async function GuestbookGameCardPage() {
  const booking = await requireBooking();
  const game = await ensureGame(booking);
  if (!game || !gameAccess(booking, await bookedExtraNamesFor(booking.id), game).active) redirect("/dashboard/audiogaestebuch");
  return <GuestbookGameCard title={gameTitle(gameConfig(game))} url={gameUrl(game.token)} backHref="/dashboard/audiogaestebuch" backLabel="Zurück zum Audiogästebuch" />;
}

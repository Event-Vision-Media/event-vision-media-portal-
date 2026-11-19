import { notFound } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestbookGameCard } from "@/components/GuestbookGameCard";
import { gameTitle } from "@/lib/guestbook-game";
import { ensureGame, gameConfig, gameUrl } from "@/lib/guestbook-game-server";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Admin: Aufsteller mit QR-Code selbst drucken (z. B. wenn der Kunde es vergessen hat). */
export default async function AdminGuestbookGameCardPage(props: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) notFound();
  const { id } = await props.params;
  const { data: booking } = await createAdminClient().from("bookings").select("*").eq("id", id).maybeSingle();
  if (!booking) notFound();
  const game = await ensureGame(booking as Booking);
  if (!game) notFound();
  return <GuestbookGameCard title={gameTitle(gameConfig(game))} url={gameUrl(game.token)} backHref={`/admin/bookings/${id}`} backLabel="Zurück zur Buchung" />;
}

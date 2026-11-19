import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Zählt anonym die Drehungen eines Gästebuch-Spiels (keine Gästedaten). */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { data } = await supabase.from("guestbook_games").select("booking_id, spins").eq("token", token).maybeSingle();
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  await supabase.from("guestbook_games").update({ spins: (data.spins ?? 0) + 1 }).eq("booking_id", data.booking_id);
  return NextResponse.json({ ok: true });
}

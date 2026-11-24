import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Was wartet gerade beim Kunden auf Freigabe? Je Layout zählt die neueste Version,
 * beim persönlichen Startbildschirm ebenfalls die neueste. revised = mindestens eine davon ist Version 2+.
 */
export async function pendingProofs(bookingId: string): Promise<{ layouts: string[]; screen: boolean; revised: boolean; informedAt: string | null }> {
  const supabase = createAdminClient();
  const [{ data: proofs }, { data: screens }, { data: log }] = await Promise.all([
    supabase.from("layout_proofs").select("layout_name, version, status").eq("booking_id", bookingId).order("version", { ascending: false }),
    supabase.from("personalized_screen_proofs").select("version, status").eq("booking_id", bookingId).order("version", { ascending: false }).limit(1),
    supabase.from("activity_log").select("created_at").eq("booking_id", bookingId).eq("event_type", "mail_layouts").order("created_at", { ascending: false }).limit(1),
  ]);
  const latest = new Map<string, { version: number; status: string }>();
  for (const p of proofs ?? []) if (!latest.has(p.layout_name)) latest.set(p.layout_name, p);
  const open = [...latest.entries()].filter(([, p]) => p.status === "in_pruefung");
  const screen = screens?.[0]?.status === "in_pruefung" ? screens[0] : null;
  return {
    layouts: open.map(([name]) => name),
    screen: Boolean(screen),
    revised: open.some(([, p]) => p.version > 1) || Boolean(screen && screen.version > 1),
    informedAt: log?.[0]?.created_at ?? null,
  };
}

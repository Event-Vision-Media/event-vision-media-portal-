import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseChallenges } from "@/components/visionbooth/challenges";
import { VB_BUCKET, type VbEvent } from "@/lib/visionbooth";

// Bestenliste der Foto-Missionen: jede Mission zählt pro Gast einmal (nur sichtbare Fotos).

export interface BoardRow {
  name: string;
  points: number;
  missions: number;
  me?: boolean;
}

export interface Board {
  top: BoardRow[];
  /** Platz, Punkte und erledigte Missionen des anfragenden Gastes */
  me: { rank: number | null; points: number; done: string[]; name: string | null } | null;
  players: number;
  /** Foto mit den meisten Herzen */
  topPhoto: { id: string; url: string; likes: number } | null;
}

export const cleanGuestKey = (v: string | null) => (v ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || null;

export async function vbBoard(event: VbEvent, guestKey: string | null, limit = 10): Promise<Board> {
  const supabase = createAdminClient();
  const challenges = new Map(parseChallenges(event.challenges).map((c) => [c.id, c]));
  const [{ data: rows }, { data: guests }, { data: liked }] = await Promise.all([
    supabase.from("vb_photos").select("guest_key, challenge_id").eq("event_id", event.id).eq("hidden", false).not("challenge_id", "is", null).limit(20000),
    supabase.from("vb_guests").select("guest_key, name").eq("event_id", event.id).limit(5000),
    supabase.from("vb_photos").select("id, file_path, likes").eq("event_id", event.id).eq("hidden", false).gt("likes", 0).order("likes", { ascending: false }).order("created_at").limit(1),
  ]);

  const done = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    if (!r.guest_key || !challenges.has(r.challenge_id)) continue;
    if (!done.has(r.guest_key)) done.set(r.guest_key, new Set());
    done.get(r.guest_key)!.add(r.challenge_id);
  }
  const names = new Map((guests ?? []).map((g) => [g.guest_key, g.name]));
  const ranked = [...done.entries()]
    .map(([key, set]) => ({ key, name: names.get(key) ?? "Gast", missions: set.size, points: [...set].reduce((s, id) => s + (challenges.get(id)?.points ?? 0), 0) }))
    .sort((a, b) => b.points - a.points || b.missions - a.missions);

  // Gleiche Punkte = gleicher Platz
  let rank = 0;
  let prev = -1;
  const withRank = ranked.map((r, i) => {
    if (r.points !== prev) rank = i + 1;
    prev = r.points;
    return { ...r, rank };
  });
  const mine = guestKey ? withRank.find((r) => r.key === guestKey) : undefined;

  let topPhoto: Board["topPhoto"] = null;
  const best = liked?.[0];
  if (best) {
    const { data } = await supabase.storage.from(VB_BUCKET).createSignedUrl(best.file_path, 60 * 60 * 6);
    if (data?.signedUrl) topPhoto = { id: best.id, url: data.signedUrl, likes: best.likes };
  }

  return {
    top: withRank.slice(0, limit).map((r) => ({ name: r.name, points: r.points, missions: r.missions, me: r.key === guestKey || undefined })),
    me: guestKey
      ? { rank: mine?.rank ?? null, points: mine?.points ?? 0, done: [...(done.get(guestKey) ?? [])], name: names.get(guestKey) ?? null }
      : null,
    players: ranked.length,
    topPhoto,
  };
}

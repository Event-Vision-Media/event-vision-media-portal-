import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseReveal, type RevealState } from "@/components/visionbooth/reveal";
import type { VbEvent } from "@/lib/visionbooth";

/** Live-Stand des Tippspiels; nach der Auflösung auch, wer richtig lag. */
export async function vbRevealState(event: VbEvent, guestKey: string | null): Promise<RevealState | null> {
  const cfg = parseReveal(event.reveal);
  if (!cfg.enabled) return null;
  const supabase = createAdminClient();
  const { data: tips } = await supabase.from("vb_tips").select("guest_key, choice").eq("event_id", event.id).limit(10000);
  const counts = { a: 0, b: 0 };
  for (const t of tips ?? []) counts[t.choice as "a" | "b"]++;
  const mine = (tips ?? []).find((t) => t.guest_key === guestKey)?.choice ?? null;
  let winners: string[] | undefined;
  if (cfg.result) {
    const keys = (tips ?? []).filter((t) => t.choice === cfg.result).map((t) => t.guest_key);
    const { data: g } = keys.length ? await supabase.from("vb_guests").select("name").eq("event_id", event.id).in("guest_key", keys.slice(0, 500)) : { data: [] };
    winners = (g ?? []).map((x) => x.name);
  }
  return { question: cfg.question, options: cfg.options, counts, result: cfg.result, mine: mine as "a" | "b" | null, winners };
}

/** Formular aus Kundenbereich/Admin anwenden: speichern, auflösen („reveal_a“/„reveal_b“) oder Auflösung zurücknehmen. */
export function revealFromForm(current: unknown, f: FormData) {
  const cfg = parseReveal(current);
  const intent = String(f.get("intent") ?? "save");
  if (intent === "reveal_a" || intent === "reveal_b") {
    return { ...cfg, enabled: true, result: intent === "reveal_a" ? "a" : "b", revealedAt: new Date().toISOString() };
  }
  if (intent === "reset") return { ...cfg, result: null, revealedAt: null };
  return parseReveal({
    ...cfg,
    enabled: f.get("reveal_enabled") === "on",
    question: f.get("reveal_question"),
    options: [0, 1].map((i) => ({ label: f.get(`reveal_label_${i}`), emoji: f.get(`reveal_emoji_${i}`), color: f.get(`reveal_color_${i}`) })),
  });
}

import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VbEvent } from "@/lib/visionbooth";

// Mitteilungen aufs Handy des Gastgebers (Web-Push). Schlüssel: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT. Fehlen sie, passiert einfach nichts.

const PHOTO_EVERY_MS = 20 * 60 * 1000; // höchstens alle 20 Minuten „neue Fotos“
const TIP_STEP = 10; // bei jedem 10. Tipp

export const pushReady = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@fotobox-essen.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export async function pushToEvent(eventId: string, payload: { title: string; body: string; url: string; tag?: string }): Promise<number> {
  if (!pushReady()) return 0;
  setup();
  const supabase = createAdminClient();
  const { data: subs } = await supabase.from("vb_push_subs").select("id, endpoint, keys").eq("event_id", eventId).limit(20);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (e: any) {
        // Abo abgelaufen oder zurückgezogen → entfernen
        if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from("vb_push_subs").delete().eq("id", s.id);
        else console.error("VisionBooth-Push:", e?.statusCode, e?.body ?? e);
      }
    })
  );
  return sent;
}

type PushState = { photoAt?: string; tips?: number };

/** Nach einem Foto-Upload: gebündelt „neue Fotos“ melden (höchstens alle 20 Minuten). */
export async function notifyNewPhotos(event: VbEvent & { push_state?: PushState | null }) {
  if (!pushReady()) return;
  const state = (event.push_state ?? {}) as PushState;
  const last = state.photoAt ? Date.parse(state.photoAt) : 0;
  if (Date.now() - last < PHOTO_EVERY_MS) return;
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("vb_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("hidden", false)
    .gt("created_at", new Date(last || 0).toISOString());
  const n = count ?? 0;
  if (!n) return;
  await supabase.from("vb_events").update({ push_state: { ...state, photoAt: new Date().toISOString() } }).eq("id", event.id);
  await pushToEvent(event.id, {
    title: event.frame_text || event.title,
    body: last ? `📸 ${n} neue ${n === 1 ? "Foto" : "Fotos"} in eurer Galerie` : "📸 Die ersten Fotos sind da – schaut mal rein!",
    url: `/vb/verwalten/${event.manage_token}`,
    tag: "fotos",
  });
}

/** Nach einem Tipp: bei jedem 10. Tipp den Stand melden. */
export async function notifyTips(event: VbEvent, counts: { a: number; b: number }, labels: [string, string]) {
  if (!pushReady()) return;
  const total = counts.a + counts.b;
  if (!total || total % TIP_STEP !== 0) return;
  const pa = Math.round((counts.a / total) * 100);
  await pushToEvent(event.id, {
    title: event.frame_text || event.title,
    body: `🔮 Schon ${total} Tipps: ${pa} % ${labels[0]} · ${100 - pa} % ${labels[1]}`,
    url: `/vb/verwalten/${event.manage_token}`,
    tag: "tipps",
  });
}

import "server-only";

// KI-Stile für VisionBooth über fal.ai (Google Nano Banana 2, Test 10/2026: beste Ähnlichkeit,
// ca. 10–15 s und ca. 0,08 $ pro Bild). Anfragen laufen über die fal-Warteschlange, damit auch
// viele Gäste gleichzeitig keine langen Server-Anfragen offen halten.

export const FAL_MODEL = "fal-ai/nano-banana-2/edit";

/** Nach dieser Zeit gilt ein Auftrag als hängen geblieben (zählt dann nicht aufs Kontingent). */
export const AI_STALE_MS = 3 * 60 * 1000;

const KEEP =
  "Keep every person exactly recognizable: same faces, identities, facial features, skin tone, hairstyles and expressions. Keep the same number of people. ";
const CLEAN =
  " Replace the original background completely with a new scene that fits the style; remove every object from the original surroundings (furniture, cups, cables, walls). Do not add any text, letters, names, logos or watermarks.";

export interface VbStyle {
  label: string;
  emoji: string;
  prompt: string;
}

export const VB_STYLES: Record<string, VbStyle> = {
  glamour: {
    label: "Hollywood-Glamour",
    emoji: "🎬",
    prompt: "Turn this photo into a glamorous Hollywood red-carpet portrait. " + KEEP + "Elegant evening wear, golden spotlights, soft bokeh, photorealistic, high detail.",
  },
  superheld: {
    label: "Superheld",
    emoji: "🦸",
    prompt: "Transform this photo into a cinematic superhero movie scene. " + KEEP + "Sleek black and gold armored suits, dramatic city skyline at night, epic lighting, photorealistic.",
  },
  animation: {
    label: "3D-Animation",
    emoji: "🧸",
    prompt: "Turn this photo into a modern 3D animated movie still. " + KEEP + "Same expressions and poses, colorful festive background, high quality render.",
  },
  comic: {
    label: "Comic",
    emoji: "💥",
    prompt: "Turn this photo into a bold pop-art comic illustration with clean ink lines, halftone dots and vibrant colors. " + KEEP + "Dynamic comic background.",
  },
  vintage: {
    label: "70er Retro",
    emoji: "🕺",
    prompt: "Turn this photo into a 1970s disco party photo. " + KEEP + "Retro 70s outfits and hairstyles styled on the same people, mirror ball, warm film grain, faded analog colors.",
  },
  neon: {
    label: "Neon-Party",
    emoji: "🌈",
    prompt: "Place the people in a vibrant neon nightclub scene. " + KEEP + "Glowing pink and blue neon lights, haze, stylish party outfits, photorealistic.",
  },
  business: {
    label: "Business-Porträt",
    emoji: "💼",
    prompt: "Turn this photo into a professional corporate portrait. " + KEEP + "Dark navy business attire, soft studio lighting, neutral grey background, photorealistic, high detail.",
  },
  weihnachten: {
    label: "Weihnachten",
    emoji: "🎄",
    prompt: "Place the people in a cozy Christmas scene. " + KEEP + "Stylish dark red Christmas sweaters, warm fairy lights and a decorated Christmas tree, photorealistic, warm atmosphere.",
  },
};

export function stylePrompt(key: string): string | null {
  const s = VB_STYLES[key];
  return s ? s.prompt + CLEAN : null;
}

function falKey(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error("FAL_KEY fehlt");
  return k;
}

/** Auftrag in die fal-Warteschlange stellen. */
export async function submitFal(prompt: string, imageDataUri: string) {
  const res = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_urls: [imageDataUri], num_images: 1, output_format: "jpeg", aspect_ratio: "4:5" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { request_id: string; status_url: string; response_url: string };
  return { statusUrl: data.status_url, responseUrl: data.response_url };
}

/** Status abfragen; bei Fertigstellung die Bild-URL liefern. */
export async function pollFal(statusUrl: string, responseUrl: string): Promise<{ done: false } | { done: true; url: string } | { error: string }> {
  const headers = { Authorization: `Key ${falKey()}` };
  const st = await fetch(statusUrl, { headers, cache: "no-store" });
  if (!st.ok) return st.status >= 500 ? { done: false } : { error: `Status ${st.status}` };
  const { status } = (await st.json()) as { status: string };
  if (status !== "COMPLETED") return { done: false };
  const r = await fetch(responseUrl, { headers, cache: "no-store" });
  if (!r.ok) return { error: (await r.text()).slice(0, 200) || `Ergebnis ${r.status}` };
  const data = (await r.json()) as { images?: { url: string }[] };
  const url = data.images?.[0]?.url;
  return url ? { done: true, url } : { error: "kein Bild im Ergebnis" };
}

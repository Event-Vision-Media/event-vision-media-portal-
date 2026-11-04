import "server-only";

// KI-Stile für VisionBooth über fal.ai (Google Nano Banana 2 / Pro). Modell, Auflösung und
// Prompt sind pro Stil gewählt – nach Ähnlichkeits-Test 10/2026 mit echtem Selfie:
//   „Klassisch“ (Variante A): Nano Banana 2, 1K, kurzer Prompt – am besten für Glamour
//   „Gesicht exakt“ (Variante B): Nano Banana 2, 2K, strenge Gesichts-Regeln – Comic/3D und Standard
//   „Pro“ (Variante C): Nano Banana Pro, 2K, strenge Gesichts-Regeln – am besten für Superheld
// Anfragen laufen über die fal-Warteschlange, damit auch viele Gäste gleichzeitig keine langen
// Server-Anfragen offen halten. Preise laut fal.ai (10/2026), „Pricing is subject to change“.

const NB2 = "fal-ai/nano-banana-2/edit";
const NB_PRO = "fal-ai/nano-banana-pro/edit";

/** Nach dieser Zeit gilt ein Auftrag als hängen geblieben (zählt dann nicht aufs Kontingent). */
export const AI_STALE_MS = 4 * 60 * 1000;

// Variante A: kurz, lässt der KI mehr Freiheit bei Pose und Bildaufbau
const KEEP =
  "Keep every person exactly recognizable: same faces, identities, facial features, skin tone, hairstyles and expressions. Keep the same number of people. ";

// Variante B/C: Gesicht hat oberste Priorität
const FACE =
  "This is an edit of the attached photo, not a new person. Every face must stay identical to the photo: " +
  "same face shape, eyes, eyebrows, nose, mouth, teeth, ears, skin texture, age, beard and hairline. " +
  "Do not beautify, slim, smooth, age or restyle the faces. Keep head size, head angle and facial expression as in the photo, " +
  "and keep the faces well lit and in sharp focus. Keep the same number of people. " +
  "If someone holds a cup, phone or other everyday object, remove it. ";

const CLEAN =
  " Replace the original background completely with a new scene that fits the style; remove every object from the original surroundings (furniture, cups, cables, walls). Do not add any text, letters, names, logos or watermarks.";

export interface VbStyle {
  label: string;
  emoji: string;
  /** Kurze Wartesprüche, während die KI rechnet */
  waits: string[];
  model: string;
  resolution: "1K" | "2K";
  /** Kosten pro Bild in US-Dollar (für die Auswertung im Admin) */
  costUsd: number;
  /** Ungefähre Rechenzeit in Sekunden (für den Fortschrittsbalken beim Gast) */
  seconds: number;
  prompt: string;
}

const A = { model: NB2, resolution: "1K" as const, costUsd: 0.08, seconds: 14 };
const B = { model: NB2, resolution: "2K" as const, costUsd: 0.12, seconds: 20 };
const C = { model: NB_PRO, resolution: "2K" as const, costUsd: 0.15, seconds: 30 };

export const VB_STYLES: Record<string, VbStyle> = {
  glamour: {
    label: "Hollywood-Glamour",
    emoji: "🎬",
    waits: ["Roter Teppich wird ausgerollt …", "Blitzlichter werden geladen …", "Smoking wird gebügelt …"],
    ...A,
    prompt: "Turn this photo into a glamorous Hollywood red-carpet portrait. " + KEEP + "Elegant evening wear, golden spotlights, soft bokeh, photorealistic, high detail.",
  },
  superheld: {
    label: "Superheld",
    emoji: "🦸",
    waits: ["Anzug wird maßgeschneidert …", "Skyline wird aufgebaut …", "Superkräfte werden geladen …"],
    ...C,
    prompt: FACE + "Change only the outfit and the scene: a sleek black and gold armored superhero suit, a dramatic city skyline at night behind, cinematic movie-poster lighting with a soft key light on the face. Photorealistic.",
  },
  animation: {
    label: "3D-Animation",
    emoji: "🧸",
    waits: ["Figuren werden modelliert …", "Farben werden gemischt …", "Kinoleinwand wird aufgespannt …"],
    ...B,
    // Eigener Prompt ohne FACE: dessen „nicht umgestalten“ verhinderte den Animationslook (Test 2.11.2026)
    prompt:
      "Transform this photo into a still from a modern 3D animated family movie: every person becomes a stylized CGI character with smooth stylized skin, slightly larger expressive eyes and soft cinematic lighting – clearly animated, not photorealistic. " +
      "Each character must still be instantly recognizable as the same person: same face shape, hairstyle and hair color, beard, glasses, skin tone, age, smile and clothing colors. Keep the same number of people and their arrangement. Remove any phone or object held in a hand. Colorful party background with warm bokeh lights, balloons and confetti (no Christmas decorations).",
  },
  comic: {
    label: "Comic",
    emoji: "💥",
    waits: ["Tusche wird angerührt …", "Sprechblasen werden versteckt …", "Pop-Art wird gezeichnet …"],
    ...B,
    prompt: FACE + "Render the whole image as a bold pop-art comic illustration with clean ink lines, halftone dots and vibrant colors, keeping the faces clearly recognizable. Dynamic comic background.",
  },
  vintage: {
    label: "70er Retro",
    emoji: "🕺",
    waits: ["Discokugel wird aufgehängt …", "Schlaghosen werden angepasst …", "Film wird entwickelt …"],
    ...B,
    prompt: FACE + "Change only outfits, hair styling and scene: a 1970s disco party with retro 70s outfits, a mirror ball, warm film grain and faded analog colors.",
  },
  neon: {
    label: "Neon-Party",
    emoji: "🌈",
    waits: ["Neonröhren werden eingeschaltet …", "Nebelmaschine läuft an …", "DJ legt los …"],
    ...B,
    prompt: FACE + "Change only outfits and scene: a vibrant neon nightclub with glowing pink and blue neon lights, haze and stylish party outfits. Photorealistic.",
  },
  business: {
    label: "Business-Porträt",
    emoji: "💼",
    waits: ["Studiolicht wird eingerichtet …", "Krawatte wird gebunden …", "Hintergrund wird gewählt …"],
    ...B,
    prompt: FACE + "Change only outfits and scene: dark navy business attire, soft professional studio lighting, neutral grey background. Photorealistic, high detail.",
  },
  weihnachten: {
    label: "Weihnachten",
    emoji: "🎄",
    waits: ["Lichterkette wird entwirrt …", "Plätzchen kommen aus dem Ofen …", "Baum wird geschmückt …"],
    ...B,
    prompt: FACE + "Remove the phone from the picture completely; hands rest naturally on shoulders. Change only outfits and scene: a cozy Christmas living room with stylish dark red Christmas sweaters, warm fairy lights and a decorated Christmas tree. Photorealistic, warm atmosphere.",
  },
};

export function stylePrompt(key: string): string | null {
  const s = VB_STYLES[key];
  return s ? s.prompt + CLEAN : null;
}

/** So lange bleiben Eingabe und KI-Ergebnis auf dem fal-CDN (danach endgültig gelöscht). */
const FAL_EXPIRE_SECONDS = 3600;

function falKey(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error("FAL_KEY fehlt");
  return k;
}

/** Auftrag in die fal-Warteschlange stellen (Modell und Auflösung je Stil). */
export async function submitFal(styleKey: string, imageDataUri: string) {
  const style = VB_STYLES[styleKey];
  const prompt = stylePrompt(styleKey);
  if (!style || !prompt) throw new Error(`Unbekannter Stil: ${styleKey}`);
  const res = await fetch(`https://queue.fal.run/${style.model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey()}`,
      "Content-Type": "application/json",
      // Datenschutz: Gästefoto und Ergebnis nicht im fal-Verlauf speichern (Standard wären 90 Tage)
      // und die Dateien auf dem fal-CDN nach einer Stunde löschen – wir holen das Bild sofort ab.
      "X-Fal-Store-IO": "0",
      "X-Fal-Object-Lifecycle-Preference": JSON.stringify({ expiration_duration_seconds: FAL_EXPIRE_SECONDS }),
    },
    body: JSON.stringify({
      prompt,
      image_urls: [imageDataUri],
      num_images: 1,
      output_format: "jpeg",
      aspect_ratio: "4:5",
      resolution: style.resolution,
    }),
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

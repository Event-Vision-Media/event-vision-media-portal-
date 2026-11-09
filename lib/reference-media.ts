/**
 * Welche Aufnahmen dürfen wir als Referenz zeigen? Abhängig von den gebuchten Geräten:
 * Fotospiegel/Fotobox → Fotos, 360° Video Booth → Videos, Audiogästebuch/LOVE → Fotos vom Aufbau.
 * Sprachnachrichten der Gäste sind sehr persönlich und werden bewusst nie als Referenz genutzt.
 */
export type RefDevice = "spiegel" | "fotobox" | "360" | "audio" | "love";

export function referenceMedia(devices: Iterable<string>): {
  /** kurz für Badges, z. B. „Fotos & Videos“ */
  label: string;
  /** für Vertrag/Einwilligung, z. B. „einzelne Fotos und Videos“ */
  phrase: string;
  /** Zusatz, falls ein Audiogästebuch gebucht ist */
  audioNote: string | null;
} {
  const d = new Set(devices);
  const photos = d.has("spiegel") || d.has("fotobox");
  const videos = d.has("360");
  const setup = !photos && (d.has("audio") || d.has("love"));
  const parts: string[] = [];
  if (photos) parts.push("Fotos");
  if (videos) parts.push("Videos");
  if (setup) parts.push("Fotos vom Aufbau");
  if (!parts.length) parts.push("Fotos");
  const join = (list: string[], and: string) => (list.length <= 1 ? list[0] : `${list.slice(0, -1).join(", ")} ${and} ${list[list.length - 1]}`);
  return {
    label: join(parts.map((p) => (p === "Fotos vom Aufbau" ? "Aufbau-Fotos" : p)), "&"),
    phrase: `einzelne ${join(parts, "und")}`,
    audioNote: d.has("audio") ? "Sprachnachrichten aus dem Audiogästebuch werden nie veröffentlicht." : null,
  };
}

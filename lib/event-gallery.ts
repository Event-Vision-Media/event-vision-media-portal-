// Eigene Online-Galerie (zuerst 360°-Videos) – gemeinsame Konstanten für Server und Browser.

export const GALLERY_BUCKET = "event-galleries";
/** Inklusive Laufzeit nach Veröffentlichung */
export const GALLERY_DAYS = 30;
/** Verlängerung im Kundenportal: Tage → Preis */
export const GALLERY_EXTENSIONS: { days: number; price: number }[] = [
  { days: 30, price: 9 },
  { days: 60, price: 15 },
];
/** Höchstens so viele Tage insgesamt */
export const GALLERY_MAX_DAYS = 90;
/** Erinnerung an den Ablauf so viele Tage vorher */
export const GALLERY_REMIND_DAYS = 5;

export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export interface GalleryItemView {
  id: string;
  name: string;
  thumb: string | null;
  src: string;
  download: string;
  duration: number | null;
  size: number | null;
}

export const formatDuration = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);

import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { includedExtraIds } from "@/lib/catalog";
import { GAME_EXTRA_ID, GAME_EXTRA_NAME, cleanCustomTasks, namesFromBooking, occasionFromBooking, type GameConfig, type GameOccasion } from "@/lib/guestbook-game";
import type { Booking } from "@/lib/types";

export interface GuestbookGameRow {
  booking_id: string;
  token: string;
  occasion: GameOccasion;
  names: string | null;
  custom_tasks: string[];
  admin_enabled: boolean;
  spins: number;
}

export interface GameAccess {
  /** Audiogästebuch gebucht */
  audio: boolean;
  /** Im Paket enthalten (Komfort/Premium) */
  included: boolean;
  /** Als Extra gebucht (Basis + 10 €) */
  extraBooked: boolean;
  /** Vom Admin freigeschaltet */
  adminEnabled: boolean;
  /** Spiel nutzbar */
  active: boolean;
}

export function gameAccess(b: Pick<Booking, "product_type" | "inquiry_items">, bookedExtraNames: string[], game: Pick<GuestbookGameRow, "admin_enabled"> | null): GameAccess {
  const audio = bookingHasAudioGuestbook(b.product_type, bookedExtraNames, b.inquiry_items);
  const included = includedExtraIds(b.inquiry_items).has(GAME_EXTRA_ID);
  const extraBooked = bookedExtraNames.includes(GAME_EXTRA_NAME) || Boolean(b.inquiry_items?.extras?.some((e) => e.id === GAME_EXTRA_ID));
  const adminEnabled = Boolean(game?.admin_enabled);
  return { audio, included, extraBooked, adminEnabled, active: audio && (included || extraBooked || adminEnabled) };
}

export async function bookedExtraNamesFor(bookingId: string): Promise<string[]> {
  const { data } = await createAdminClient().from("booking_extras").select("extras(name)").eq("booking_id", bookingId);
  return (data ?? []).map((be: any) => be.extras?.name).filter(Boolean);
}

export async function getGame(bookingId: string): Promise<GuestbookGameRow | null> {
  const { data } = await createAdminClient().from("guestbook_games").select("*").eq("booking_id", bookingId).maybeSingle();
  return (data as GuestbookGameRow | null) ?? null;
}

/** Spiel-Datensatz holen oder mit Vorschlägen aus der Buchung anlegen (fester Token = fester QR-Code). */
export async function ensureGame(b: Booking): Promise<GuestbookGameRow | null> {
  const existing = await getGame(b.id);
  if (existing) return existing;
  const occasion = occasionFromBooking(b);
  const row = { booking_id: b.id, token: randomBytes(9).toString("base64url"), occasion, names: namesFromBooking(b, occasion) || null, custom_tasks: [] };
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("guestbook_games").insert(row).select("*").single();
  if (error) return getGame(b.id); // parallel angelegt
  return data as GuestbookGameRow;
}

export function gameConfig(g: Pick<GuestbookGameRow, "occasion" | "names" | "custom_tasks">): GameConfig {
  return { occasion: g.occasion, names: g.names ?? "", customTasks: cleanCustomTasks(g.custom_tasks) };
}

export function gameUrl(token: string): string {
  const base = (process.env.PORTAL_URL || "https://portal.fotobox-essen.com").replace(/\/$/, "");
  return `${base}/gb/${token}`;
}

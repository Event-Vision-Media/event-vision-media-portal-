import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { vbManageUrl } from "@/lib/visionbooth";
import { daysUntil } from "@/lib/catalog";
import type { Booking } from "@/lib/types";

/**
 * Schalter „VisionBooth als Zusatz anbieten“ (Kundenportal, Erinnerungsmail).
 * Seit 22.11.2026 an. Zum Abschalten in Vercel VB_UPSELL=0 setzen (dann Redeploy).
 */
export function vbUpsellLive(): boolean {
  return process.env.VB_UPSELL !== "0";
}

export interface VbAddonState {
  /** schon angelegt (gebucht oder von dir geschenkt) */
  existing: { manageUrl: string; plan: string; free: boolean; price: number | null } | null;
  /** Angebot zeigen? */
  offer: boolean;
}

/** Hat die Buchung schon eine VisionBooth – und darf der Zusatz angeboten werden? */
export async function vbAddonState(b: Booking): Promise<VbAddonState> {
  const { data } = await createAdminClient().from("vb_events").select("*").eq("booking_id", b.id).maybeSingle();
  if (data) return { existing: { manageUrl: vbManageUrl(data.manage_token), plan: data.plan, free: data.package === "addon-gratis", price: data.addon_price != null ? Number(data.addon_price) : null }, offer: false };
  return { existing: null, offer: vbUpsellLive() && b.lifecycle === "bestaetigt" && daysUntil(b.event_date) >= 2 };
}

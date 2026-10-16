import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Werbekosten je Monat ("YYYY-MM" → €), gepflegt im Admin unter Statistik. */
export async function getAdSpend(): Promise<Record<string, number>> {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "ad_spend").maybeSingle();
  try {
    const parsed = JSON.parse(data?.value ?? "{}");
    return Object.fromEntries(Object.entries(parsed).filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && Number.isFinite(Number(v))).map(([k, v]) => [k, Number(v)]));
  } catch {
    return {};
  }
}

/** Kam die Anfrage über eine bezahlte Google-Anzeige? */
export function isPaidGoogle(src: { source?: string; medium?: string; gclid?: string } | null | undefined): boolean {
  if (!src) return false;
  if (src.gclid) return true;
  return /google/i.test(src.source ?? "") && /^(cpc|ppc|paid|ads)$/i.test(src.medium ?? "");
}

import "server-only";
import { ADDON_CHARGED, getPlan } from "@/components/visionbooth/packages";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXTRAS as CATALOG_EXTRAS, bundledExtraNames, premiumLayoutIncluded } from "@/lib/catalog";
import { buildContract, type BankDetails, type ContractDoc, type RenterDetails } from "@/lib/contract";
import { SELECTION_SWITCH_FEE, type Booking } from "@/lib/types";

export interface SignedContract extends RenterDetails {
  id: string;
  booking_id: string;
  template_version: string;
  snapshot: ContractDoc;
  snapshot_sha256: string;
  location_confirmed: boolean;
  withdrawal_ack: boolean;
  early_start_requested: boolean;
  reference_consent: boolean;
  signer_name: string;
  signature_png: string;
  signed_at: string;
  signed_ip: string | null;
  signed_user_agent: string | null;
  countersigned_at: string | null;
}

export const BANK_SETTING_KEYS = {
  holder: "contract_bank_holder",
  iban: "contract_bank_iban",
  bic: "contract_bank_bic",
  bank: "contract_bank_name",
} as const;

export async function getBankDetails(): Promise<BankDetails | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("app_settings").select("key, value").in("key", Object.values(BANK_SETTING_KEYS));
  const get = (k: string) => (data ?? []).find((r) => r.key === k)?.value ?? null;
  const bank: BankDetails = {
    holder: get(BANK_SETTING_KEYS.holder),
    iban: get(BANK_SETTING_KEYS.iban),
    bic: get(BANK_SETTING_KEYS.bic),
    bank: get(BANK_SETTING_KEYS.bank),
  };
  return bank.iban ? bank : null;
}

/** Lädt alles, was für den Vertragstext einer Buchung nötig ist. */
export async function contractInputFor(booking: Booking) {
  const supabase = createAdminClient();
  const [{ data: bookedExtras }, { data: layout }, bank, { data: vbAddon }] = await Promise.all([
    supabase.from("booking_extras").select("price, extras(name), extra_variants(name)").eq("booking_id", booking.id),
    booking.selected_layout_id
      ? supabase.from("layouts").select("extra_price").eq("id", booking.selected_layout_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getBankDetails(),
    supabase.from("vb_events").select("*").eq("booking_id", booking.id).maybeSingle(),
  ]);

  const bookedExtraNames = (bookedExtras ?? []).map((be: any) => be.extras?.name).filter(Boolean) as string[];
  const inquiryExtraNames = new Set([
    ...(booking.inquiry_items?.extras ?? []).map((e) => CATALOG_EXTRAS.find((c) => c.id === e.id)?.dbExtraName).filter(Boolean),
    ...bundledExtraNames(booking.inquiry_items),
  ]);
  const laterExtras = (bookedExtras ?? [])
    .filter((be: any) => be.extras?.name && !inquiryExtraNames.has(be.extras.name))
    .map((be: any) => ({
      name: be.extra_variants?.name ? `${be.extras.name}: ${be.extra_variants.name}` : be.extras.name,
      price: Number(be.price) || 0,
    }));

  const portalFees: { name: string; price: number }[] = [];
  const premiumFee = booking.is_premium_selected && !premiumLayoutIncluded(booking) ? Number((layout as any)?.extra_price ?? 0) : 0;
  const premiumInInquiry = (booking.inquiry_items?.extras ?? []).some((e) => e.id === "premium-layout");
  if (premiumFee > 0 && !premiumInInquiry) portalFees.push({ name: "Premium-Layout", price: premiumFee });
  const switches = (booking.layout_switch_count ?? 0) + (booking.home_screen_switch_count ?? 0);
  if (switches > 0) portalFees.push({ name: `Layout-/Startbildschirm-Wechsel (${switches}×)`, price: switches * SELECTION_SWITCH_FEE });
  // Online-Galerie im Kundenportal verlängert
  const { data: gallery } = await supabase.from("event_galleries").select("extension_days, extension_price").eq("booking_id", booking.id).maybeSingle();
  if (gallery && Number(gallery.extension_price) > 0) portalFees.push({ name: `Online-Galerie verlängert (+${gallery.extension_days} Tage)`, price: Number(gallery.extension_price) });
  // VisionBooth als Zusatz zur Buchung (im Portal dazugebucht oder vom Admin mit Preis angelegt)
  if (vbAddon && vbAddon.package === ADDON_CHARGED) {
    const plan = getPlan(vbAddon.plan);
    // addon_price = beim Dazubuchen festgehaltener Preis (z. B. Black Week), sonst Listenpreis
    const price = vbAddon.addon_price != null ? Number(vbAddon.addon_price) : plan.price;
    if (plan.kind === "addon" && price > 0) portalFees.push({ name: plan.label, price });
  }

  // Auswahl bei im Firmen-Komplett enthaltenen Extras (z. B. Hintergrund-Motiv)
  const bundledNames = new Set(bundledExtraNames(booking.inquiry_items));
  const includedChoices = (bookedExtras ?? [])
    .filter((be: any) => bundledNames.has(be.extras?.name) && be.extra_variants?.name)
    .map((be: any) => `${be.extras.name}: ${be.extra_variants.name}`);

  return { booking, bookedExtraNames, laterExtras, portalFees, bank, includedChoices };
}

export async function buildContractFor(booking: Booking, renter?: RenterDetails | null): Promise<ContractDoc> {
  return buildContract({ ...(await contractInputFor(booking)), renter });
}

export async function getLatestContract(bookingId: string): Promise<SignedContract | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_contracts")
    .select("*")
    .eq("booking_id", bookingId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SignedContract | null) ?? null;
}

/** Status je Buchung für Listen (Admin). */
export async function contractStatusByBooking(bookingIds: string[]): Promise<Map<string, "unterschrieben" | "gegengezeichnet">> {
  const map = new Map<string, "unterschrieben" | "gegengezeichnet">();
  if (bookingIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_contracts")
    .select("booking_id, countersigned_at")
    .in("booking_id", bookingIds);
  for (const row of data ?? []) {
    if (row.countersigned_at) map.set(row.booking_id, "gegengezeichnet");
    else if (!map.has(row.booking_id)) map.set(row.booking_id, "unterschrieben");
  }
  return map;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

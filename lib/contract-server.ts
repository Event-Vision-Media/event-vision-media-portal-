import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXTRAS as CATALOG_EXTRAS } from "@/lib/catalog";
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
  const [{ data: bookedExtras }, { data: layout }, bank] = await Promise.all([
    supabase.from("booking_extras").select("price, extras(name), extra_variants(name)").eq("booking_id", booking.id),
    booking.selected_layout_id
      ? supabase.from("layouts").select("extra_price").eq("id", booking.selected_layout_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getBankDetails(),
  ]);

  const bookedExtraNames = (bookedExtras ?? []).map((be: any) => be.extras?.name).filter(Boolean) as string[];
  const inquiryExtraNames = new Set(
    (booking.inquiry_items?.extras ?? []).map((e) => CATALOG_EXTRAS.find((c) => c.id === e.id)?.dbExtraName).filter(Boolean)
  );
  const laterExtras = (bookedExtras ?? [])
    .filter((be: any) => be.extras?.name && !inquiryExtraNames.has(be.extras.name))
    .map((be: any) => ({
      name: be.extra_variants?.name ? `${be.extras.name}: ${be.extra_variants.name}` : be.extras.name,
      price: Number(be.price) || 0,
    }));

  const portalFees: { name: string; price: number }[] = [];
  const premiumFee = booking.is_premium_selected && !booking.premium_layout_included ? Number((layout as any)?.extra_price ?? 0) : 0;
  const premiumInInquiry = (booking.inquiry_items?.extras ?? []).some((e) => e.id === "premium-layout");
  if (premiumFee > 0 && !premiumInInquiry) portalFees.push({ name: "Premium-Layout", price: premiumFee });
  const switches = (booking.layout_switch_count ?? 0) + (booking.home_screen_switch_count ?? 0);
  if (switches > 0) portalFees.push({ name: `Layout-/Startbildschirm-Wechsel (${switches}×)`, price: switches * SELECTION_SWITCH_FEE });

  return { booking, bookedExtraNames, laterExtras, portalFees, bank };
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

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailability, type AvailabilityInfo } from "@/lib/availability";
import type { AvailabilityBlock, Extra, ExtraVariant } from "@/lib/types";

export interface AvailabilityBoard {
  extras: Extra[];
  variants: ExtraVariant[];
  blocks: AvailabilityBlock[];
  byExtraId: Record<string, AvailabilityInfo>;
  byVariantId: Record<string, AvailabilityInfo>;
}

/**
 * Lädt den vollständigen Verfügbarkeits-Stand für ein Datum: alle Extras und
 * Varianten mit ihrem berechneten Status. Wird sowohl im Kundenbereich
 * (Event Highlights für das Buchungsdatum) als auch im Adminbereich
 * (Verfügbarkeitsübersicht) verwendet.
 *
 * excludeBookingId: im Kundenbereich die eigene Buchung übergeben, damit die
 * bereits selbst gewählten Exemplare nicht als "für mich ausgebucht" zählen
 * (sonst stünde bei einem bereits gesicherten letzten Exemplar verwirrend
 * "Ausgebucht" neben "✓ Ausgewählt"). Im Adminbereich weglassen, damit dort
 * der tatsächliche Gesamtstand über alle Buchungen sichtbar bleibt.
 */
export async function getAvailabilityBoard(
  date: string,
  excludeBookingId?: string
): Promise<AvailabilityBoard> {
  const supabase = createAdminClient();

  const [{ data: extrasData }, { data: variantsData }, { data: bookingsOnDate }, { data: blocksData }] =
    await Promise.all([
      supabase.from("extras").select("*").order("sort_order", { ascending: true }),
      supabase.from("extra_variants").select("*").order("sort_order", { ascending: true }),
      supabase.from("bookings").select("id").eq("event_date", date),
      supabase
        .from("availability_blocks")
        .select("*")
        .lte("start_date", date)
        .gte("end_date", date),
    ]);

  const extras = (extrasData ?? []) as Extra[];
  const variants = (variantsData ?? []) as ExtraVariant[];
  const blocks = (blocksData ?? []) as AvailabilityBlock[];

  const bookingIds = (bookingsOnDate ?? []).map((b) => b.id);
  let bookingExtras: { booking_id: string; extra_id: string; variant_id: string | null }[] = [];
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("booking_extras")
      .select("booking_id, extra_id, variant_id")
      .in("booking_id", bookingIds);
    bookingExtras = data ?? [];
  }

  const bookedByExtra = new Map<string, number>();
  const bookedByVariant = new Map<string, number>();
  bookingExtras
    .filter((be) => be.booking_id !== excludeBookingId)
    .forEach((be) => {
    bookedByExtra.set(be.extra_id, (bookedByExtra.get(be.extra_id) ?? 0) + 1);
    if (be.variant_id) {
      bookedByVariant.set(be.variant_id, (bookedByVariant.get(be.variant_id) ?? 0) + 1);
    }
  });

  const blockedByExtra = new Map<string, number>();
  const blockedByVariant = new Map<string, number>();
  blocks.forEach((b) => {
    if (b.extra_id) {
      blockedByExtra.set(b.extra_id, (blockedByExtra.get(b.extra_id) ?? 0) + b.blocked_quantity);
    }
    if (b.variant_id) {
      blockedByVariant.set(b.variant_id, (blockedByVariant.get(b.variant_id) ?? 0) + b.blocked_quantity);
    }
  });

  const byExtraId: Record<string, AvailabilityInfo> = {};
  extras.forEach((extra) => {
    byExtraId[extra.id] = computeAvailability(
      extra.total_stock,
      bookedByExtra.get(extra.id) ?? 0,
      blockedByExtra.get(extra.id) ?? 0
    );
  });

  const byVariantId: Record<string, AvailabilityInfo> = {};
  variants.forEach((variant) => {
    const parent = byExtraId[variant.extra_id];
    if (parent && parent.total !== null) {
      // Geteilter Bestand auf Extra-Ebene (z.B. Audiogästebuch): alle
      // Varianten teilen sich denselben Status.
      byVariantId[variant.id] = parent;
    } else {
      byVariantId[variant.id] = computeAvailability(
        variant.total_stock,
        bookedByVariant.get(variant.id) ?? 0,
        blockedByVariant.get(variant.id) ?? 0
      );
    }
  });

  return { extras, variants, blocks, byExtraId, byVariantId };
}

/**
 * Prüft die Verfügbarkeit eines einzelnen Extras/einer Variante für ein
 * Datum — für die serverseitige Durchsetzung beim Auswählen. Die eigene,
 * bereits bestehende Auswahl derselben Buchung wird nicht mitgezählt, damit
 * ein Wechsel zwischen Varianten desselben Extras nicht fälschlich blockiert.
 */
export async function getAvailabilityForItem(
  date: string,
  extraId: string,
  variantId: string | null,
  excludeBookingId?: string
): Promise<AvailabilityInfo> {
  const supabase = createAdminClient();

  const { data: extra } = await supabase
    .from("extras")
    .select("total_stock")
    .eq("id", extraId)
    .maybeSingle();

  let total = extra?.total_stock ?? null;
  let sharedAtExtraLevel = true;

  if (total == null && variantId) {
    const { data: variant } = await supabase
      .from("extra_variants")
      .select("total_stock")
      .eq("id", variantId)
      .maybeSingle();
    total = variant?.total_stock ?? null;
    sharedAtExtraLevel = false;
  }

  const { data: blocksData } = await supabase
    .from("availability_blocks")
    .select("blocked_quantity")
    .lte("start_date", date)
    .gte("end_date", date)
    .eq(sharedAtExtraLevel ? "extra_id" : "variant_id", sharedAtExtraLevel ? extraId : variantId!);
  const blocked = (blocksData ?? []).reduce((sum, b) => sum + b.blocked_quantity, 0);

  if (total == null) {
    return computeAvailability(null, 0, blocked);
  }

  const { data: bookingsOnDate } = await supabase.from("bookings").select("id").eq("event_date", date);
  const bookingIds = (bookingsOnDate ?? [])
    .map((b) => b.id)
    .filter((id) => id !== excludeBookingId);

  let booked = 0;
  if (bookingIds.length > 0) {
    let query = supabase
      .from("booking_extras")
      .select("id", { count: "exact", head: true })
      .in("booking_id", bookingIds)
      .eq("extra_id", extraId);
    if (!sharedAtExtraLevel && variantId) {
      query = query.eq("variant_id", variantId);
    }
    const { count } = await query;
    booked = count ?? 0;
  }

  return computeAvailability(total, booked, blocked);
}

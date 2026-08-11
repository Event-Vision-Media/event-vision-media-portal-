"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { getAvailabilityForItem } from "@/lib/availability-server";
import { logActivity } from "@/lib/activity-log";

export interface ActionResult {
  success?: boolean;
  error?: string;
}

export async function selectLayout(
  layoutId: string,
  isPremium: boolean
): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      selected_layout_id: layoutId,
      is_premium_selected: isPremium,
      status:
        booking.status === "personalisierung_komplett"
          ? booking.status
          : "layout_ausgewaehlt",
    })
    .eq("id", booking.id);

  if (error) {
    return { error: "Die Auswahl konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await logActivity(booking.id, "layout_selected", `${booking.couple_names} hat ein Layout ausgewählt.`);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/layout");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function selectLayoutWithPersonalization(
  layoutId: string,
  isPremium: boolean,
  personalization: { name: string; date: string; wishes: string }
): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const name = personalization.name.trim();
  if (!name) {
    return { error: "Bitte gib den Namen bzw. die Namen fürs Layout an." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      selected_layout_id: layoutId,
      is_premium_selected: isPremium,
      personalization_name: name,
      personalization_date: personalization.date.trim() || null,
      extra_wishes: personalization.wishes.trim() || null,
      status: "personalisierung_komplett",
    })
    .eq("id", booking.id);

  if (error) {
    return { error: "Die Angaben konnten nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "layout_personalized",
    `${booking.couple_names} hat ein Layout ausgewählt und personalisiert.`
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/layout");
  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function selectHomeScreen(homeScreenId: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { data: homeScreen, error: homeScreenError } = await supabase
    .from("home_screens")
    .select("id, product_type")
    .eq("id", homeScreenId)
    .maybeSingle();

  if (homeScreenError || !homeScreen || homeScreen.product_type !== booking.product_type) {
    return { error: "Dieser Startbildschirm ist aktuell nicht verfügbar." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ selected_home_screen_id: homeScreenId })
    .eq("id", booking.id);

  if (error) {
    return { error: "Die Auswahl konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "home_screen_selected",
    `${booking.couple_names} hat einen Startbildschirm ausgewählt.`
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/startbildschirm");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

async function resetExtrasConfirmation(bookingId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .update({ extras_confirmed_at: null })
    .eq("id", bookingId)
    .not("extras_confirmed_at", "is", null);
}

async function isExtraLockedByAdmin(bookingId: string, extraId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_extras")
    .select("added_by_admin")
    .eq("booking_id", bookingId)
    .eq("extra_id", extraId)
    .maybeSingle();
  return Boolean(data?.added_by_admin);
}

export async function selectSimpleExtra(extraId: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  if (await isExtraLockedByAdmin(booking.id, extraId)) {
    return { error: "Diese Option wurde bereits für euch gebucht und kann nicht geändert werden." };
  }

  const supabase = createAdminClient();
  const { data: extra, error: extraError } = await supabase
    .from("extras")
    .select("id, price, has_variants, is_active, category")
    .eq("id", extraId)
    .maybeSingle();

  if (extraError || !extra || !extra.is_active || extra.has_variants) {
    return { error: "Dieses Extra ist aktuell nicht verfügbar." };
  }

  const availability = await getAvailabilityForItem(booking.event_date, extraId, null, booking.id);
  if (availability.status === "ausgebucht") {
    return { error: "Für dieses Datum leider ausgebucht." };
  }

  const { error } = await supabase.from("booking_extras").upsert(
    {
      booking_id: booking.id,
      extra_id: extraId,
      variant_id: null,
      price: extra.price,
    },
    { onConflict: "booking_id,extra_id" }
  );

  if (error) {
    return { error: "Konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  // Personalisierter Startbildschirm ersetzt die Auswahl aus der
  // Standard-Galerie, statt zusätzlich dazu zu bestehen.
  if (extra.category === "Startbildschirm" && booking.selected_home_screen_id) {
    await supabase
      .from("bookings")
      .update({ selected_home_screen_id: null })
      .eq("id", booking.id);
    revalidatePath("/dashboard/startbildschirm");
  }

  await resetExtrasConfirmation(booking.id);
  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function selectExtraVariant(
  extraId: string,
  variantId: string
): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  if (await isExtraLockedByAdmin(booking.id, extraId)) {
    return { error: "Diese Option wurde bereits für euch gebucht und kann nicht geändert werden." };
  }

  const supabase = createAdminClient();
  const { data: variant, error: variantError } = await supabase
    .from("extra_variants")
    .select("id, price, is_available, extra_id")
    .eq("id", variantId)
    .maybeSingle();

  if (variantError || !variant || !variant.is_available || variant.extra_id !== extraId) {
    return { error: "Diese Variante ist aktuell nicht verfügbar." };
  }

  const availability = await getAvailabilityForItem(
    booking.event_date,
    extraId,
    variantId,
    booking.id
  );
  if (availability.status === "ausgebucht") {
    return { error: "Für dieses Datum leider ausgebucht." };
  }

  const { error } = await supabase.from("booking_extras").upsert(
    {
      booking_id: booking.id,
      extra_id: extraId,
      variant_id: variantId,
      price: variant.price,
    },
    { onConflict: "booking_id,extra_id" }
  );

  if (error) {
    return { error: "Konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await resetExtrasConfirmation(booking.id);
  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function removeExtra(extraId: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  if (await isExtraLockedByAdmin(booking.id, extraId)) {
    return { error: "Diese Option wurde bereits für euch gebucht und kann nicht entfernt werden." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("booking_extras")
    .delete()
    .eq("booking_id", booking.id)
    .eq("extra_id", extraId);

  if (error) {
    return { error: "Konnte nicht entfernt werden. Bitte versuche es erneut." };
  }

  await resetExtrasConfirmation(booking.id);
  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function confirmExtras(): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("booking_extras")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", booking.id);

  if (!count) {
    return { error: "Bitte wähle zuerst mindestens ein Extra aus." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ extras_confirmed_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (error) {
    return { error: "Konnte nicht bestätigt werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "extras_confirmed",
    `${booking.couple_names} hat die Event Highlights verbindlich bestätigt.`
  );

  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function confirmNoExtras(): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("booking_extras")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", booking.id);

  if (count) {
    return {
      error: "Du hast bereits Extras ausgewählt. Entferne sie zuerst, um 'Keine Extras' zu bestätigen.",
    };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ extras_confirmed_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (updateError) {
    return { error: "Konnte nicht bestätigt werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "extras_confirmed_none",
    `${booking.couple_names} hat bestätigt: keine Event Highlights gewünscht.`
  );

  revalidatePath("/dashboard/event-highlights");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateAccessNotes(notes: string): Promise<ActionResult> {
  const booking = await getCurrentBooking();
  if (!booking) {
    return { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." };
  }

  const trimmed = notes.trim();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      access_notes: trimmed || null,
      access_notes_updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (error) {
    return { error: "Konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  await logActivity(
    booking.id,
    "access_notes_updated",
    `${booking.couple_names} hat Zugangshinweise zur Lieferung hinterlegt.`
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin/lieferung");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";

export interface AdminActionResult {
  success?: boolean;
  error?: string;
  bookingCode?: string;
}

async function generateBookingCode(): Promise<string> {
  const supabase = createAdminClient();
  const year = new Date().getFullYear();
  const prefix = `FB-${year}-`;

  const { data } = await supabase
    .from("bookings")
    .select("booking_code")
    .like("booking_code", `${prefix}%`)
    .order("booking_code", { ascending: false })
    .limit(1);

  const lastCode = data?.[0]?.booking_code;
  const lastNumber = lastCode ? parseInt(lastCode.replace(prefix, ""), 10) : 0;
  const nextNumber = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export async function createBooking(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const coupleNames = String(formData.get("couple_names") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const productType = String(formData.get("product_type") ?? "").trim();
  const customLoginCode = String(formData.get("custom_login_code") ?? "").trim() || null;

  if (!coupleNames || !eventDate || !productType) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }

  const bookingCode = await generateBookingCode();
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      booking_code: bookingCode,
      couple_names: coupleNames,
      event_date: eventDate,
      product_type: productType,
      status: "offen",
      custom_login_code: customLoginCode,
    })
    .select("id")
    .single();

  if (error || !booking) {
    if (error?.code === "23505") {
      return {
        error:
          "Dieses individuelle Passwort wird bereits für eine andere Buchung verwendet. Bitte wähle ein anderes.",
      };
    }
    return { error: "Buchung konnte nicht angelegt werden." };
  }

  const [{ data: extrasData }, { data: variantsData }] = await Promise.all([
    supabase.from("extras").select("id, price, has_variants"),
    supabase.from("extra_variants").select("id, extra_id, price"),
  ]);

  const extrasById = new Map((extrasData ?? []).map((e) => [e.id, e]));
  const variantsById = new Map((variantsData ?? []).map((v) => [v.id, v]));

  const bookingExtraRows: {
    booking_id: string;
    extra_id: string;
    variant_id: string | null;
    price: number;
    added_by_admin: boolean;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("extra_")) continue;
    const extraId = key.slice("extra_".length);
    const extra = extrasById.get(extraId);
    if (!extra) continue;
    const raw = String(value);

    if (extra.has_variants) {
      if (!raw) continue;
      const variant = variantsById.get(raw);
      if (!variant || variant.extra_id !== extraId) continue;
      bookingExtraRows.push({
        booking_id: booking.id,
        extra_id: extraId,
        variant_id: raw,
        price: variant.price,
        added_by_admin: true,
      });
    } else {
      if (raw !== "on") continue;
      bookingExtraRows.push({
        booking_id: booking.id,
        extra_id: extraId,
        variant_id: null,
        price: extra.price,
        added_by_admin: true,
      });
    }
  }

  if (bookingExtraRows.length > 0) {
    await supabase.from("booking_extras").insert(bookingExtraRows);
  }

  revalidatePath("/admin/dashboard");
  return { success: true, bookingCode };
}

export async function deleteBooking(bookingId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

  if (error) {
    return { error: "Buchung konnte nicht gelöscht werden." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function createLayout(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const isPremium = formData.get("is_premium") === "on";
  const extraPrice = isPremium ? Number(formData.get("extra_price") ?? 25) : 0;
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const imageFile = formData.get("image") as File | null;

  if (!name) {
    return { error: "Bitte einen Namen für das Layout angeben." };
  }

  const supabase = createAdminClient();
  let previewImageUrl = String(formData.get("preview_image_url") ?? "").trim();

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const filePath = `${randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("layout-previews")
      .upload(filePath, imageFile, { contentType: imageFile.type });

    if (uploadError) {
      return { error: "Bild-Upload fehlgeschlagen." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("layout-previews")
      .getPublicUrl(filePath);
    previewImageUrl = publicUrlData.publicUrl;
  }

  if (!previewImageUrl) {
    return { error: "Bitte ein Vorschaubild hochladen oder eine Bild-URL angeben." };
  }

  const category = isPremium
    ? String(formData.get("category") ?? "").trim() || null
    : null;

  const { error } = await supabase.from("layouts").insert({
    name,
    preview_image_url: previewImageUrl,
    is_premium: isPremium,
    extra_price: extraPrice,
    sort_order: sortOrder,
    category,
  });

  if (error) {
    return { error: "Layout konnte nicht angelegt werden (Name evtl. bereits vergeben)." };
  }

  revalidatePath("/admin/layouts");
  return { success: true };
}

export async function updateLayoutSortOrder(
  layoutId: string,
  sortOrder: number
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  if (!Number.isFinite(sortOrder)) {
    return { error: "Bitte eine gültige Zahl eingeben." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("layouts")
    .update({ sort_order: sortOrder })
    .eq("id", layoutId);

  if (error) {
    return { error: "Sortierung konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/layouts");
  revalidatePath("/dashboard/layout");
  return { success: true };
}

export async function updateLayoutName(
  layoutId: string,
  newName: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const name = newName.trim();
  if (!name) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("layouts")
    .update({ name })
    .eq("id", layoutId);

  if (error) {
    return { error: "Name konnte nicht gespeichert werden (evtl. bereits vergeben)." };
  }

  revalidatePath("/admin/layouts");
  revalidatePath("/dashboard/layout");
  return { success: true };
}

export async function updateLayoutCategory(
  layoutId: string,
  category: string | null
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("layouts")
    .update({ category: category || null })
    .eq("id", layoutId);

  if (error) {
    return { error: "Kategorie konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/layouts");
  revalidatePath("/dashboard/layout");
  return { success: true };
}

export async function updateLayoutImage(
  layoutId: string,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) {
    return { error: "Bitte eine Bilddatei auswählen." };
  }

  const supabase = createAdminClient();
  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const filePath = `${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("layout-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("layout-previews")
    .getPublicUrl(filePath);

  const { error } = await supabase
    .from("layouts")
    .update({ preview_image_url: publicUrlData.publicUrl })
    .eq("id", layoutId);

  if (error) {
    return { error: "Bild konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/layouts");
  revalidatePath("/dashboard/layout");
  return { success: true };
}

export async function deleteLayout(layoutId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("layouts").delete().eq("id", layoutId);

  if (error) {
    return { error: "Layout konnte nicht gelöscht werden." };
  }

  revalidatePath("/admin/layouts");
  return { success: true };
}

export async function createHomeScreen(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const productType = String(formData.get("product_type") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const imageFile = formData.get("image") as File | null;

  if (!productType || !name) {
    return { error: "Bitte Produkt und Namen angeben." };
  }

  if (!imageFile || imageFile.size === 0) {
    return { error: "Bitte ein Vorschaubild hochladen." };
  }

  const supabase = createAdminClient();
  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const filePath = `${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("home-screen-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("home-screen-previews")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("home_screens").insert({
    product_type: productType,
    name,
    preview_image_url: publicUrlData.publicUrl,
    sort_order: sortOrder,
  });

  if (error) {
    return { error: "Startbildschirm konnte nicht angelegt werden." };
  }

  revalidatePath("/admin/home-screens");
  return { success: true };
}

export async function updateHomeScreenSortOrder(
  homeScreenId: string,
  sortOrder: number
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  if (!Number.isFinite(sortOrder)) {
    return { error: "Bitte eine gültige Zahl eingeben." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("home_screens")
    .update({ sort_order: sortOrder })
    .eq("id", homeScreenId);

  if (error) {
    return { error: "Sortierung konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/home-screens");
  revalidatePath("/dashboard/startbildschirm");
  return { success: true };
}

export async function updateHomeScreenName(
  homeScreenId: string,
  newName: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const name = newName.trim();
  if (!name) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("home_screens")
    .update({ name })
    .eq("id", homeScreenId);

  if (error) {
    return { error: "Name konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/home-screens");
  revalidatePath("/dashboard/startbildschirm");
  return { success: true };
}

export async function updateHomeScreenImage(
  homeScreenId: string,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) {
    return { error: "Bitte eine Bilddatei auswählen." };
  }

  const supabase = createAdminClient();
  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const filePath = `${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("home-screen-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("home-screen-previews")
    .getPublicUrl(filePath);

  const { error } = await supabase
    .from("home_screens")
    .update({ preview_image_url: publicUrlData.publicUrl })
    .eq("id", homeScreenId);

  if (error) {
    return { error: "Bild konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/home-screens");
  revalidatePath("/dashboard/startbildschirm");
  return { success: true };
}

export async function deleteHomeScreen(homeScreenId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("home_screens").delete().eq("id", homeScreenId);

  if (error) {
    return { error: "Startbildschirm konnte nicht gelöscht werden." };
  }

  revalidatePath("/admin/home-screens");
  return { success: true };
}

export async function updateOnlineGalleryUrl(
  bookingId: string,
  url: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const trimmed = url.trim();
  let normalizedUrl: string | null = null;

  if (trimmed) {
    normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      new URL(normalizedUrl);
    } catch {
      return { error: "Bitte eine gültige URL angeben." };
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ online_gallery_url: normalizedUrl })
    .eq("id", bookingId);

  if (error) {
    return { error: "Link konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCustomLoginCode(
  bookingId: string,
  code: string
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const trimmed = code.trim();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ custom_login_code: trimmed || null })
    .eq("id", bookingId);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Dieses individuelle Passwort wird bereits für eine andere Buchung verwendet.",
      };
    }
    return { error: "Passwort konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updatePersonalizedScreenExample(
  productType: string,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) {
    return { error: "Bitte eine Bilddatei auswählen." };
  }

  const supabase = createAdminClient();
  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const filePath = `${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("home-screen-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("home-screen-previews")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("personalized_screen_examples").upsert(
    {
      product_type: productType,
      example_image_url: publicUrlData.publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_type" }
  );

  if (error) {
    return { error: "Beispielbild konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/home-screens");
  revalidatePath("/dashboard/startbildschirm");
  return { success: true };
}

export async function updateGoogleReviewUrl(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const trimmed = String(formData.get("url") ?? "").trim();
  let normalizedUrl: string | null = null;

  if (trimmed) {
    normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      new URL(normalizedUrl);
    } catch {
      return { error: "Bitte eine gültige URL angeben." };
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_settings").upsert(
    { key: "google_review_url", value: normalizedUrl, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  if (error) {
    return { error: "Link konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDeliveryPickupInfo(
  bookingId: string,
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      delivery_date: field("delivery_date"),
      delivery_time: field("delivery_time"),
      delivery_time_window: field("delivery_time_window"),
      delivery_contact_name: field("delivery_contact_name"),
      delivery_contact_phone: field("delivery_contact_phone"),
      pickup_date: field("pickup_date"),
      pickup_time: field("pickup_time"),
      pickup_time_window: field("pickup_time_window"),
      pickup_contact_name: field("pickup_contact_name"),
      pickup_contact_phone: field("pickup_contact_phone"),
      access_notes: field("access_notes"),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: "Angaben konnten nicht gespeichert werden." };
  }

  revalidatePath("/admin/lieferung");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard");
  return { success: true };
}


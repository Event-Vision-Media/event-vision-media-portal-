"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/require-admin";
import type { AdminActionResult } from "@/app/actions/admin";

export type { AdminActionResult };

function revalidateExtrasPaths() {
  revalidatePath("/admin/extras");
  revalidatePath("/dashboard/event-highlights");
}

export async function createExtra(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Bitte einen Namen angeben." };
  }

  const category = String(formData.get("category") ?? "Exclusive Extras").trim() || "Exclusive Extras";
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const hasVariants = formData.get("has_variants") === "on";
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const imageFile = formData.get("image") as File | null;

  const supabase = createAdminClient();
  let previewImageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const filePath = `${randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("extra-previews")
      .upload(filePath, imageFile, { contentType: imageFile.type });

    if (uploadError) {
      return { error: "Bild-Upload fehlgeschlagen." };
    }

    const { data: publicUrlData } = supabase.storage.from("extra-previews").getPublicUrl(filePath);
    previewImageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("extras").insert({
    name,
    category,
    description,
    preview_image_url: previewImageUrl,
    price: hasVariants ? 0 : price,
    has_variants: hasVariants,
    is_active: true,
    sort_order: sortOrder,
  });

  if (error) {
    return { error: "Extra konnte nicht angelegt werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function updateExtra(
  extraId: string,
  fields: Partial<{
    name: string;
    category: string;
    description: string | null;
    price: number;
    sort_order: number;
    is_active: boolean;
    total_stock: number | null;
  }>
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  if (fields.name !== undefined && !fields.name.trim()) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("extras").update(fields).eq("id", extraId);

  if (error) {
    return { error: "Änderung konnte nicht gespeichert werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function updateExtraImage(
  extraId: string,
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
    .from("extra-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage.from("extra-previews").getPublicUrl(filePath);

  const { error } = await supabase
    .from("extras")
    .update({ preview_image_url: publicUrlData.publicUrl })
    .eq("id", extraId);

  if (error) {
    return { error: "Bild konnte nicht gespeichert werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function deleteExtra(extraId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("extras").delete().eq("id", extraId);

  if (error) {
    return { error: "Extra konnte nicht gelöscht werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function createVariant(
  extraId: string,
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Bitte einen Namen angeben." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const features = String(formData.get("features") ?? "").trim() || null;
  const isPopular = formData.get("is_popular") === "on";
  const imageFile = formData.get("image") as File | null;

  const supabase = createAdminClient();
  let previewImageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const filePath = `${randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("extra-previews")
      .upload(filePath, imageFile, { contentType: imageFile.type });

    if (uploadError) {
      return { error: "Bild-Upload fehlgeschlagen." };
    }

    const { data: publicUrlData } = supabase.storage.from("extra-previews").getPublicUrl(filePath);
    previewImageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("extra_variants").insert({
    extra_id: extraId,
    name,
    description,
    preview_image_url: previewImageUrl,
    price,
    features,
    is_popular: isPopular,
    is_available: true,
    sort_order: sortOrder,
  });

  if (error) {
    return { error: "Variante konnte nicht angelegt werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function updateVariant(
  variantId: string,
  fields: Partial<{
    name: string;
    description: string | null;
    price: number;
    sort_order: number;
    is_available: boolean;
    features: string | null;
    is_popular: boolean;
    total_stock: number | null;
  }>
): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  if (fields.name !== undefined && !fields.name.trim()) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("extra_variants").update(fields).eq("id", variantId);

  if (error) {
    return { error: "Änderung konnte nicht gespeichert werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function updateVariantImage(
  variantId: string,
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
    .from("extra-previews")
    .upload(filePath, imageFile, { contentType: imageFile.type });

  if (uploadError) {
    return { error: "Bild-Upload fehlgeschlagen." };
  }

  const { data: publicUrlData } = supabase.storage.from("extra-previews").getPublicUrl(filePath);

  const { error } = await supabase
    .from("extra_variants")
    .update({ preview_image_url: publicUrlData.publicUrl })
    .eq("id", variantId);

  if (error) {
    return { error: "Bild konnte nicht gespeichert werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

export async function deleteVariant(variantId: string): Promise<AdminActionResult> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Nicht angemeldet." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("extra_variants").delete().eq("id", variantId);

  if (error) {
    return { error: "Variante konnte nicht gelöscht werden." };
  }

  revalidateExtrasPaths();
  return { success: true };
}

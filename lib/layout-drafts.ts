import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Entwürfe aus dem Layout-Designer der Website (Vorschau-Grafik + Logo).
 * Liegen in einem privaten Speicher; der Admin sieht sie über zeitlich
 * begrenzte Download-Links.
 */
export const LAYOUT_DRAFT_BUCKET = "layout-drafts";

const DATA_URL = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/;

export function parseImageDataUrl(value: unknown, maxBytes: number): { mime: string; bytes: Buffer } | null {
  if (typeof value !== "string") return null;
  const m = DATA_URL.exec(value);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > maxBytes) return null;
  return { mime: m[1], bytes };
}

async function ensureBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(LAYOUT_DRAFT_BUCKET);
  if (!data) await supabase.storage.createBucket(LAYOUT_DRAFT_BUCKET, { public: false, fileSizeLimit: "8MB" });
}

/** Lädt Vorschau und Logo hoch und gibt die Speicherpfade zurück (Fehler werden nur protokolliert). */
export async function storeLayoutDraftFiles(
  bookingId: string,
  files: {
    image?: { mime: string; bytes: Buffer } | null;
    logo?: { mime: string; bytes: Buffer } | null;
    overlay?: { mime: string; bytes: Buffer } | null;
  }
): Promise<{ imagePath?: string; logoPath?: string; overlayPath?: string }> {
  const out: { imagePath?: string; logoPath?: string; overlayPath?: string } = {};
  if (!files.image && !files.logo && !files.overlay) return out;
  try {
    await ensureBucket();
    const supabase = createAdminClient();
    for (const [key, file, name] of [
      ["imagePath", files.image, "entwurf"],
      ["logoPath", files.logo, "logo"],
      ["overlayPath", files.overlay?.mime === "image/png" ? files.overlay : null, "druckvorlage-dslrbooth"],
    ] as const) {
      if (!file) continue;
      const path = `${bookingId}/${name}.${file.mime === "image/png" ? "png" : "jpg"}`;
      const { error } = await supabase.storage
        .from(LAYOUT_DRAFT_BUCKET)
        .upload(path, file.bytes, { contentType: file.mime, upsert: true });
      if (error) console.error("[layout-draft] upload failed", error.message);
      else out[key] = path;
    }
  } catch (err) {
    console.error("[layout-draft] storage error", err);
  }
  return out;
}

/** Zeitlich begrenzte Links zum Ansehen/Herunterladen für den Admin. */
export async function layoutDraftLinks(draft: { imagePath?: string; logoPath?: string; overlayPath?: string } | null | undefined) {
  const out: { image?: string; imageDownload?: string; logo?: string; overlay?: string } = {};
  if (!draft?.imagePath && !draft?.logoPath && !draft?.overlayPath) return out;
  const bucket = createAdminClient().storage.from(LAYOUT_DRAFT_BUCKET);
  if (draft.imagePath) {
    out.image = (await bucket.createSignedUrl(draft.imagePath, 3600)).data?.signedUrl;
    out.imageDownload = (await bucket.createSignedUrl(draft.imagePath, 3600, { download: "layout-entwurf.jpg" })).data?.signedUrl;
  }
  if (draft.overlayPath) {
    out.overlay = (await bucket.createSignedUrl(draft.overlayPath, 3600, { download: "dslrbooth-druckvorlage.png" })).data?.signedUrl;
  }
  if (draft.logoPath) {
    out.logo = (await bucket.createSignedUrl(draft.logoPath, 3600, { download: "kunden-logo.png" })).data?.signedUrl;
  }
  return out;
}

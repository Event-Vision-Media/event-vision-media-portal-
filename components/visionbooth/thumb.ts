// Kleines Vorschaubild (600 px breit) im Browser erzeugen – für Galerie-Kacheln, Kundenbereich und Admin.

const THUMB_W = 600;

export async function makeThumb(blob: Blob): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const s = Math.min(1, THUMB_W / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.76));
    c.width = c.height = 0;
    return out;
  } catch {
    return null; // ohne Vorschaubild geht es auch – dann zeigt die Galerie das große Foto
  }
}

/** Upload-Body: Foto + Vorschaubild als multipart, sonst nur das Foto. */
export async function photoBody(photo: Blob): Promise<{ body: BodyInit; multipart: boolean }> {
  const thumb = await makeThumb(photo);
  if (!thumb) return { body: photo, multipart: false };
  const fd = new FormData();
  fd.append("photo", photo, "foto.jpg");
  fd.append("thumb", thumb, "thumb.jpg");
  return { body: fd, multipart: true };
}

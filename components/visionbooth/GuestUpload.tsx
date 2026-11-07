"use client";

import { useRef, useState } from "react";
import { Sheet } from "./Missions";
import { photoBody } from "./thumb";

// Eigene Fotos aus der Handy-Galerie in die gemeinsame Galerie laden: mehrere auf einmal,
// im Browser auf max. 2560 px verkleinert (schnell auch im Party-WLAN), 3 parallel, mit Wiederholung.

const MAX_SIDE = 2560;
const PARALLEL = 3;

interface Item {
  name: string;
  thumb: string;
  state: "wartet" | "laeuft" | "ok" | "fehler";
  error?: string;
}

function guestKey(): string {
  try {
    let k = localStorage.getItem("vb-guest");
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem("vb-guest", k);
    }
    return k;
  } catch {
    return "";
  }
}

/** Bild verkleinern und als JPEG ausgeben (Drehung laut Kamera wird vom Browser übernommen). */
async function shrink(file: File): Promise<Blob> {
  let src: ImageBitmap | HTMLImageElement;
  let w: number;
  let h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    src = bmp;
    w = bmp.width;
    h = bmp.height;
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    src = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const s = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  if ("close" in src) src.close();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
  c.width = c.height = 0;
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  return blob;
}

export function GuestUpload({ slug, deleteAfter, onDone }: { slug: string; deleteAfter: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const done = items.filter((i) => i.state === "ok").length;
  const failed = items.filter((i) => i.state === "fehler").length;
  const finished = items.length > 0 && !busy;

  async function start(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, 100);
    const next: Item[] = list.map((f) => ({ name: f.name, thumb: URL.createObjectURL(f), state: "wartet" }));
    setItems(next);
    setBusy(true);
    const set = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((x, n) => (n === i ? { ...x, ...patch } : x)));
    const queue = list.map((f, i) => ({ f, i }));
    const g = guestKey();

    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        set(job.i, { state: "laeuft" });
        try {
          const blob = await shrink(job.f);
          const { body, multipart } = await photoBody(blob);
          let lastErr = "Upload fehlgeschlagen";
          let ok = false;
          for (let attempt = 0; attempt < 3 && !ok; attempt++) {
            if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
            const res = await fetch(`/api/vb/${slug}/upload`, {
              method: "POST",
              headers: { ...(multipart ? {} : { "content-type": "image/jpeg" }), "x-vb-guest": g, "x-vb-kind": "gast" },
              body,
            }).catch(() => null);
            if (res?.ok) ok = true;
            else {
              const data = await res?.json().catch(() => ({}));
              lastErr = data?.error || "Netz kurz weg";
              if (res && res.status !== 429 && res.status < 500) break; // z. B. Limit erreicht – nicht nochmal versuchen
            }
          }
          set(job.i, ok ? { state: "ok" } : { state: "fehler", error: lastErr });
        } catch (e: any) {
          set(job.i, { state: "fehler", error: /decode|source/i.test(String(e?.message)) ? "Format nicht unterstützt" : e?.message || "Fehler" });
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setBusy(false);
    try {
      navigator.vibrate?.([20, 40, 20]);
    } catch {
      /* iPhone */
    }
    onDone();
  }

  function close() {
    if (busy) return;
    items.forEach((i) => URL.revokeObjectURL(i.thumb));
    setItems([]);
    setOpen(false);
    if (input.current) input.current.value = "";
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="vb-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold">
        📷 Eigene Fotos hinzufügen
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => start(e.target.files)} />

      {open && (
        <Sheet title="Eigene Fotos teilen" onClose={close}>
          {items.length === 0 ? (
            <div>
              <p className="text-4xl">📷</p>
              <p className="vb-display mt-2 text-2xl font-semibold">Deine Fotos für alle</p>
              <p className="mt-1 text-[14px] leading-relaxed text-white/65">
                Teile die Fotos, die du heute mit deiner Handy-Kamera gemacht hast – sie landen in der gemeinsamen Galerie und auf der Foto-Wand.
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-white/60">
                <li>✓ Mehrere Fotos auf einmal auswählen</li>
                <li>✓ Bitte nur eigene Fotos – sie sind für alle mit dem Link sichtbar</li>
                <li>✓ Automatisch gelöscht am {new Date(deleteAfter).toLocaleDateString("de-DE")}</li>
              </ul>
              <button onClick={() => input.current?.click()} className="vb-btn mt-6 w-full rounded-full py-4 text-[16px] font-bold">
                Fotos auswählen
              </button>
            </div>
          ) : (
            <div>
              <p className="vb-display text-2xl font-semibold">{finished ? (failed ? "Fast alles geschafft" : "Danke fürs Teilen! 🎉") : "Fotos werden geteilt …"}</p>
              <p className="mt-1 text-[14px] text-white/65">
                {done} von {items.length} hochgeladen{failed ? ` · ${failed} nicht geklappt` : ""}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${((done + failed) / items.length) * 100}%`, background: "var(--a)" }} />
              </div>
              <div className="mt-4 grid max-h-[40dvh] grid-cols-4 gap-1.5 overflow-y-auto">
                {items.map((it, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-white/5" title={it.error}>
                    <img src={it.thumb} alt="" className={`h-full w-full object-cover ${it.state === "ok" ? "" : "opacity-50"}`} />
                    <span className="absolute inset-0 flex items-center justify-center text-lg">
                      {it.state === "ok" ? "✅" : it.state === "fehler" ? "⚠️" : it.state === "laeuft" ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : ""}
                    </span>
                  </div>
                ))}
              </div>
              {failed > 0 && finished && <p className="mt-3 text-xs text-amber-200">{items.find((i) => i.state === "fehler")?.error}</p>}
              {finished && (
                <button onClick={close} className="vb-btn mt-5 w-full rounded-full py-4 text-[16px] font-bold">
                  Zur Galerie
                </button>
              )}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

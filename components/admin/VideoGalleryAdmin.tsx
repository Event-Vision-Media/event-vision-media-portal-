"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { deleteGalleryItem, prepareGalleryUploads, publishGallery, registerGalleryItems, updateGalleryTitle } from "@/app/actions/admin-gallery";
import { GALLERY_BUCKET, VIDEO_TYPES, formatDuration, type GalleryItemView } from "@/lib/event-gallery";

/** Vorschaubild (JPEG, max. 640 px) und Länge direkt im Browser aus dem Video holen. */
async function probeVideo(file: File): Promise<{ thumb: Blob | null; duration: number | null }> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.src = url;
    await new Promise<void>((ok, fail) => {
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error("kein Video"));
      setTimeout(() => fail(new Error("Zeitüberschreitung")), 15000);
    });
    const duration = Number.isFinite(v.duration) ? v.duration : null;
    v.currentTime = Math.min(1.5, (duration ?? 2) / 2);
    await new Promise<void>((ok) => {
      v.onseeked = () => ok();
      setTimeout(ok, 4000);
    });
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight || 1));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const thumb = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.8));
    return { thumb, duration };
  } catch {
    return { thumb: null, duration: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const mb = (n: number) => `${(n / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;

export function VideoGalleryAdmin({
  bookingId,
  state,
  title,
  publicUrl,
  expiresAt,
  views,
  items,
  linkIsBookingGallery,
}: {
  bookingId: string;
  state: "keine" | "entwurf" | "online" | "abgelaufen" | "geloescht";
  title: string | null;
  publicUrl: string | null;
  expiresAt: string | null;
  views: number;
  items: GalleryItemView[];
  /** Galerie-Link ist der Online-Galerie-Link der Buchung (sonst eigener Link zusätzlich) */
  linkIsBookingGallery: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number; current: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title ?? "");
  const [pending, start] = useTransition();

  async function upload(list: FileList | File[] | null) {
    const all = Array.from(list ?? []).filter((f) => VIDEO_TYPES.includes(f.type));
    // 360°-Software legt jedes Video zusätzlich als „…_fullSize.MP4“ (HEVC, ~5× größer, spielt nicht überall) ab.
    // Gibt es die normale Version (in der Auswahl oder schon in der Galerie), wird die fullSize-Datei übersprungen.
    const known = new Set([...all.map((f) => f.name.toLowerCase()), ...items.map((i) => i.name.toLowerCase())]);
    const isDouble = (f: File) => /_fullsize(\.[^.]+)$/i.test(f.name) && known.has(f.name.toLowerCase().replace(/_fullsize(\.[^.]+)$/, "$1"));
    const files = all.filter((f) => !isDouble(f));
    const skipped = all.length - files.length;
    if (!files.length) return setError(skipped ? `Nur „_fullSize“-Doppel ausgewählt (${skipped}) – die normalen Versionen sind schon in der Galerie.` : "Bitte Videos auswählen (MP4, MOV oder WebM).");
    setError(null);
    setMsg(null);
    setBusy({ done: 0, total: files.length, current: "Vorschaubilder werden erstellt …" });
    const probes: { thumb: Blob | null; duration: number | null }[] = [];
    for (const f of files) probes.push(await probeVideo(f));
    const prep = await prepareGalleryUploads(bookingId, files.map((f, i) => ({ name: f.name, type: f.type, size: f.size, thumb: Boolean(probes[i].thumb) })));
    if ("error" in prep && prep.error) {
      setBusy(null);
      return setError(prep.error);
    }
    const uploads = (prep as { uploads: { video: { path: string; token: string }; thumb: { path: string; token: string } | null }[] }).uploads;
    const store = createBrowserSupabaseClient().storage.from(GALLERY_BUCKET);
    const done: Parameters<typeof registerGalleryItems>[1] = [];
    const failed: string[] = [];
    let n = 0;
    // Drei Uploads gleichzeitig
    const queue = files.map((f, i) => ({ f, i }));
    async function worker() {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { f, i } = job;
        const u = uploads[i];
        setBusy((b) => (b ? { ...b, current: f.name } : b));
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          const r = await store.uploadToSignedUrl(u.video.path, u.video.token, f, { contentType: f.type });
          ok = !r.error;
        }
        let thumbPath: string | null = null;
        if (ok && u.thumb && probes[i].thumb) {
          const t = await store.uploadToSignedUrl(u.thumb.path, u.thumb.token, probes[i].thumb!, { contentType: "image/jpeg" });
          if (!t.error) thumbPath = u.thumb.path;
        }
        if (ok) done.push({ file_path: u.video.path, thumb_path: thumbPath, file_name: f.name, size_bytes: f.size, duration_sec: probes[i].duration });
        else failed.push(f.name);
        n++;
        setBusy((b) => (b ? { ...b, done: n } : b));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (done.length) {
      const r = await registerGalleryItems(bookingId, done);
      if (r.error) failed.push(r.error);
    }
    setBusy(null);
    if (failed.length) setError(`Nicht geklappt: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? " …" : ""} – bitte diese erneut hochladen.`);
    setMsg(`${done.length} Video${done.length === 1 ? "" : "s"} hochgeladen.${skipped ? ` ${skipped} „_fullSize“-Doppel übersprungen.` : ""}`);
    router.refresh();
  }

  const totalSize = items.reduce((s, i) => s + (i.size ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            state === "online" ? "bg-emerald-50 text-emerald-700" : state === "abgelaufen" || state === "geloescht" ? "bg-red-50 text-red-700" : "bg-anthracite-100 text-anthracite-600"
          }`}
        >
          {state === "online" ? "Online" : state === "abgelaufen" ? "Abgelaufen" : state === "geloescht" ? "Gelöscht" : state === "entwurf" ? "Noch nicht freigeschaltet" : "Noch keine Galerie"}
        </span>
        {items.length > 0 && <span className="text-anthracite-500">{items.length} Videos · {mb(totalSize)}</span>}
        {state === "online" && expiresAt && <span className="text-anthracite-500">· verfügbar bis {new Date(expiresAt).toLocaleDateString("de-DE")}</span>}
        {state === "online" && <span className="text-anthracite-500">· {views}× aufgerufen</span>}
      </div>

      {publicUrl && state === "entwurf" && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand-50 p-3 text-sm">
          <a href={publicUrl} target="_blank" rel="noopener" className="rounded-lg border border-gold-300 bg-white px-3 py-1.5 font-medium text-gold-800">👀 Vorschau ansehen</a>
          <span className="text-xs text-anthracite-500">So sieht die Seite für Gäste aus – nur für dich sichtbar, bis du freischaltest.</span>
        </div>
      )}

      {publicUrl && (state === "online" || state === "abgelaufen") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand-50 p-3 text-sm">
          <a href={publicUrl} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate font-medium text-gold-700 underline underline-offset-2">{publicUrl}</a>
          <button type="button" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => setMsg("Link kopiert."))} className="rounded-lg border border-anthracite-200 bg-white px-3 py-1.5">Link kopieren</button>
          <p className="w-full text-xs text-anthracite-500">
            {linkIsBookingGallery
              ? "Ist als Online-Galerie-Link der Buchung hinterlegt – Kundenportal und „Kunde informieren“ nutzen ihn automatisch."
              : "Die Buchung hat schon einen anderen Galerie-Link (z. B. Fotos). Die Videos erscheinen im Kundenportal als eigene Karte."}
          </p>
        </div>
      )}

      <label className="block text-sm">
        <span className="text-xs font-medium text-anthracite-500">Titel der Galerie</span>
        <div className="mt-1 flex gap-2">
          <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="z. B. Hochzeit Anna & Max · 12. Juni 2027" className="input-field flex-1 py-2" />
          <button type="button" disabled={pending || state === "keine"} onClick={() => start(async () => { await updateGalleryTitle(bookingId, titleDraft); router.refresh(); })} className="rounded-lg border border-anthracite-200 px-3 text-sm disabled:opacity-50">Speichern</button>
        </div>
      </label>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) upload(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "border-gold-400 bg-gold-50" : "border-anthracite-200 bg-white"}`}
      >
        <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        {busy ? (
          <div>
            <p className="font-medium text-anthracite-800">Lade hoch … {busy.done} von {busy.total}</p>
            <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-anthracite-100"><div className="h-full bg-gold-500 transition-all" style={{ width: `${(busy.done / busy.total) * 100}%` }} /></div>
            <p className="mt-2 truncate text-xs text-anthracite-400">{busy.current}</p>
            <p className="mt-1 text-xs text-anthracite-400">Bitte das Fenster offen lassen.</p>
          </div>
        ) : (
          <>
            <p className="font-medium text-anthracite-800">360°-Videos hierher ziehen</p>
            <p className="mt-1 text-sm text-anthracite-500">oder <button type="button" onClick={() => input.current?.click()} className="font-medium text-gold-700 underline underline-offset-2">Dateien auswählen</button> – auch einzelne Videos später nachladen.</p>
          </>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">✓ {msg}</p>}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((it) => (
            <div key={it.id} className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-anthracite-900">
              {it.thumb ? <img src={it.thumb} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center text-2xl">🎬</span>}
              {it.duration != null && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{formatDuration(it.duration)}</span>}
              <button
                type="button"
                title="Video entfernen"
                onClick={() => { if (confirm(`„${it.name}“ aus der Galerie entfernen?`)) start(async () => { await deleteGalleryItem(bookingId, it.id); router.refresh(); }); }}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && state !== "online" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const r = await publishGallery(bookingId); if (r.error) setError(r.error); else setMsg("Galerie ist online. Jetzt oben bei „Kunde informieren“ die Mail schicken."); router.refresh(); })}
          className="w-full rounded-xl bg-anthracite-800 px-4 py-3 text-sm font-semibold text-white hover:bg-anthracite-700 disabled:opacity-50"
        >
          {state === "abgelaufen" ? "Wieder freischalten – 30 Tage ab heute (kostenlos, von dir)" : "Galerie freischalten – 30 Tage online"}
        </button>
      )}
    </div>
  );
}

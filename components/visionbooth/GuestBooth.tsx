"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawCover, drawFrame, FRAME_H, FRAME_W, onAccent, type FrameOptions } from "./frame";

interface GuestEvent {
  slug: string;
  title: string;
  frameText: string;
  frameStyle: FrameOptions["style"];
  accent: string;
  logoUrl: string | null;
  galleryEnabled: boolean;
  aiStyles: { key: string; label: string; emoji: string }[];
  aiPerGuest: number;
}

interface Variant {
  id: string;
  label: string;
  style?: string;
  blob: Blob;
  url: string;
  upload: Upload;
  uploadMsg?: string;
}

type Step = "start" | "kamera" | "ergebnis";
type Upload = "aus" | "laeuft" | "ok" | "fehler";

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

/** Gäste-Ablauf: Start → Kamera mit Rahmen und Countdown → Ergebnis mit Download/Teilen und KI-Stilen. */
export function GuestBooth({ event }: { event: GuestEvent }) {
  const [step, setStep] = useState<Step>("start");
  const [consent, setConsent] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sel, setSel] = useState("original");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLeft, setAiLeft] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  /** Original ohne Rahmen – Grundlage für die KI, bleibt nur im Browser. */
  const rawRef = useRef<Blob | null>(null);

  const opts = useCallback(
    (mirror: boolean): FrameOptions => ({ style: event.frameStyle, text: event.frameText, accent: event.accent, logo: logoRef.current, mirror }),
    [event]
  );

  // Logo einmal laden (crossOrigin, damit das Canvas exportierbar bleibt)
  useEffect(() => {
    if (!event.logoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => (logoRef.current = img);
    img.src = event.logoUrl;
  }, [event.logoUrl]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Kamera starten, sobald der Kamera-Schritt aktiv ist (oder die Kamera gewechselt wird)
  useEffect(() => {
    if (step !== "kamera") return;
    let cancelled = false;
    setCamError(null);
    (async () => {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Dein Browser erlaubt hier keinen Kamerazugriff.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        const ctx = canvasRef.current!.getContext("2d")!;
        const loop = () => {
          if (v.videoWidth) drawFrame(ctx, v, v.videoWidth, v.videoHeight, opts(facing === "user"));
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e: any) {
        setCamError(
          e?.name === "NotAllowedError"
            ? "Kamera nicht freigegeben. Erlaube den Zugriff in den Browser-Einstellungen – oder nimm einfach ein Foto mit der Kamera-App auf."
            : "Kamera konnte nicht gestartet werden. Nimm einfach ein Foto mit der Kamera-App auf."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, facing, opts, stopCamera]);

  const toBlob = (c: HTMLCanvasElement, q = 0.9) => new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));

  async function uploadVariant(v: Variant) {
    if (!consent) return;
    setVariant(v.id, { upload: "laeuft" });
    try {
      const headers: Record<string, string> = { "content-type": "image/jpeg", "x-vb-guest": guestKey() };
      if (v.style) {
        headers["x-vb-kind"] = "ki";
        headers["x-vb-style"] = v.style;
      }
      const res = await fetch(`/api/vb/${event.slug}/upload`, { method: "POST", headers, body: v.blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload fehlgeschlagen");
      setVariant(v.id, { upload: "ok" });
    } catch (e: any) {
      setVariant(v.id, { upload: "fehler", uploadMsg: e?.message || "Upload fehlgeschlagen" });
    }
  }

  function setVariant(id: string, patch: Partial<Variant>) {
    setVariants((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addVariant(v: Variant) {
    setVariants((list) => [...list, v]);
    setSel(v.id);
    uploadVariant(v);
  }

  async function finish(framed: Blob, raw: Blob | null) {
    stopCamera();
    variants.forEach((v) => URL.revokeObjectURL(v.url));
    rawRef.current = raw;
    setAiError(null);
    const v: Variant = { id: "original", label: "Original", blob: framed, url: URL.createObjectURL(framed), upload: consent ? "laeuft" : "aus" };
    setVariants([v]);
    setSel(v.id);
    setStep("ergebnis");
    try {
      setCanShare(Boolean(navigator.canShare?.({ files: [new File([framed], "visionbooth.jpg", { type: "image/jpeg" })] })));
    } catch {
      setCanShare(false);
    }
    uploadVariant(v);
  }

  /** Fertiges Foto mit Rahmen + Original ohne Rahmen (für die KI) erzeugen. */
  async function exportFrame(src: CanvasImageSource, sw: number, sh: number, mirror: boolean) {
    const c = document.createElement("canvas");
    c.width = FRAME_W;
    c.height = FRAME_H;
    drawFrame(c.getContext("2d")!, src, sw, sh, opts(mirror));
    const framed = await toBlob(c);
    let raw: Blob | null = null;
    if (event.aiStyles.length) {
      const r = document.createElement("canvas");
      r.width = 960;
      r.height = 1200;
      drawCover(r.getContext("2d")!, src, sw, sh, 0, 0, r.width, r.height, mirror);
      raw = await toBlob(r, 0.88);
    }
    if (framed) finish(framed, raw);
  }

  async function startAi(style: { key: string; label: string; emoji: string }) {
    if (aiBusy || !rawRef.current) return;
    setAiBusy(style.key);
    setAiError(null);
    const g = guestKey();
    try {
      const res = await fetch(`/api/vb/${event.slug}/ai?style=${style.key}`, {
        method: "POST",
        headers: { "content-type": "image/jpeg", "x-vb-guest": g },
        body: rawRef.current,
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data?.remaining === "number") setAiLeft(data.remaining);
      if (!res.ok) throw new Error(data?.error || "Das hat leider nicht geklappt.");
      const jobId: string = data.jobId;

      // Status abfragen, bis das Bild fertig ist (max. ca. 3 Minuten)
      const deadline = Date.now() + 180_000;
      let status = "laeuft";
      while (status === "laeuft" && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500));
        const s = await fetch(`/api/vb/${event.slug}/ai/${jobId}`, { headers: { "x-vb-guest": g }, cache: "no-store" });
        status = s.ok ? (await s.json()).status : "laeuft";
      }
      if (status !== "fertig") throw new Error("Die KI hat diesmal kein Bild geliefert – versuch einen anderen Stil.");

      const img = await fetch(`/api/vb/${event.slug}/ai/${jobId}/image`, { headers: { "x-vb-guest": g } });
      if (!img.ok) throw new Error("Bild konnte nicht geladen werden.");
      const bmp = await createImageBitmap(await img.blob());
      const c = document.createElement("canvas");
      c.width = FRAME_W;
      c.height = FRAME_H;
      drawFrame(c.getContext("2d")!, bmp, bmp.width, bmp.height, opts(false));
      const framed = await toBlob(c);
      if (!framed) throw new Error("Bild konnte nicht erstellt werden.");
      addVariant({ id: jobId, label: `${style.emoji} ${style.label}`, style: style.key, blob: framed, url: URL.createObjectURL(framed), upload: consent ? "laeuft" : "aus" });
    } catch (e: any) {
      setAiError(e?.message || "Das hat leider nicht geklappt.");
    } finally {
      setAiBusy(null);
    }
  }

  function shoot() {
    if (count !== null) return;
    let n = 3;
    setCount(n);
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(t);
      setCount(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      const v = videoRef.current;
      if (v?.videoWidth) exportFrame(v, v.videoWidth, v.videoHeight, facing === "user");
    }, 1000);
  }

  function fromFile(f: File | undefined) {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      exportFrame(img, img.naturalWidth, img.naturalHeight, false);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  }

  const current = variants.find((v) => v.id === sel) ?? variants[0];

  async function share() {
    if (!current) return;
    try {
      await navigator.share({ files: [new File([current.blob], "visionbooth.jpg", { type: "image/jpeg" })], title: event.title });
    } catch {
      /* abgebrochen */
    }
  }

  function again() {
    if (aiBusy) return;
    variants.forEach((v) => URL.revokeObjectURL(v.url));
    setVariants([]);
    rawRef.current = null;
    setAiError(null);
    if (fileRef.current) fileRef.current.value = "";
    setStep("kamera");
  }

  const gold = event.accent;
  const ink = onAccent(gold);

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-[#0d0d0f] text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => fromFile(e.target.files?.[0])} />

      {step === "start" && (
        <section className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
          {event.logoUrl && <img src={event.logoUrl} alt="" className="mb-6 max-h-20 max-w-[60%] object-contain" />}
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">VisionBooth</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight" style={{ color: gold }}>
            {event.frameText}
          </h1>
          <p className="mt-4 text-sm text-white/70">Mach ein Foto mit dem Event-Rahmen und nimm es direkt mit – ganz ohne App.</p>

          {event.galleryEnabled && (
            <label className="mt-8 flex items-start gap-3 text-left text-xs text-white/70">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#c4933f]" />
              <span>Meine Fotos dürfen in der Event-Galerie und auf der Foto-Wand erscheinen. Ohne Haken bleiben sie nur auf deinem Handy.</span>
            </label>
          )}
          <button
            onClick={() => setStep("kamera")}
            className="mt-6 w-full rounded-full py-4 text-lg font-semibold shadow-lg transition active:scale-95"
            style={{ background: gold, color: ink }}
          >
            📸 Foto machen
          </button>

          <a href="https://fotobox-essen.com/datenschutz" className="mt-6 text-[11px] text-white/40 underline">
            Datenschutz
          </a>
        </section>
      )}

      {step === "kamera" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-4">
          <div className="relative w-full max-w-md">
            <video ref={videoRef} playsInline muted autoPlay className="hidden" />
            <canvas ref={canvasRef} width={FRAME_W} height={FRAME_H} className="block w-full rounded-lg bg-black" style={{ aspectRatio: `${FRAME_W}/${FRAME_H}`, maxHeight: "72dvh", objectFit: "contain" }} />
            {count !== null && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span key={count} className="animate-countdown font-serif text-[9rem] font-bold drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]" style={{ color: gold }}>
                  {count}
                </span>
              </div>
            )}
            {flash && <div className="pointer-events-none absolute inset-0 rounded-lg bg-white" />}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/85 p-6 text-center text-sm text-white/80">
                <p>{camError}</p>
                <button onClick={() => fileRef.current?.click()} className="rounded-full px-6 py-3 font-semibold" style={{ background: gold, color: ink }}>
                  Foto aufnehmen
                </button>
                <button onClick={() => { stopCamera(); setStep("start"); }} className="text-xs text-white/60 underline">
                  Zurück
                </button>
              </div>
            )}
          </div>

          {!camError && (
            <div className="flex w-full max-w-md items-center justify-between px-4">
              <button onClick={() => { stopCamera(); setStep("start"); }} className="h-12 w-12 rounded-full bg-white/10 text-xl" aria-label="Zurück">
                ←
              </button>
              <button
                onClick={shoot}
                disabled={count !== null}
                aria-label="Auslösen"
                className="h-20 w-20 rounded-full border-4 bg-white/10 transition active:scale-90 disabled:opacity-50"
                style={{ borderColor: gold }}
              >
                <span className="mx-auto block h-14 w-14 rounded-full" style={{ background: gold, color: ink }} />
              </button>
              <button
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                className="h-12 w-12 rounded-full bg-white/10 text-xl"
                aria-label="Kamera wechseln"
              >
                ⟲
              </button>
            </div>
          )}
        </section>
      )}

      {step === "ergebnis" && current && (
        <section className="flex flex-1 flex-col items-center gap-4 px-4 py-4">
          <div className="relative w-full max-w-md">
            <img src={current.url} alt="Dein Foto" className="mx-auto w-full rounded-lg shadow-2xl" style={{ maxHeight: "60dvh", objectFit: "contain" }} />
            {aiBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20" style={{ borderTopColor: gold }} />
                <p className="text-sm font-medium">✨ Die KI zaubert …</p>
                <p className="text-xs text-white/60">dauert ca. 15 Sekunden</p>
              </div>
            )}
          </div>

          {variants.length > 1 && (
            <div className="flex w-full max-w-md gap-2 overflow-x-auto pb-1">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSel(v.id)}
                  className={`flex-none rounded-full px-3 py-1.5 text-xs font-medium ${v.id === current.id ? "" : "bg-white/10 text-white/80"}`}
                  style={v.id === current.id ? { background: gold, color: ink } : undefined}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex w-full max-w-md flex-col gap-3">
            {canShare ? (
              <button onClick={share} className="rounded-full py-4 font-semibold" style={{ background: gold, color: ink }}>
                Speichern / Teilen
              </button>
            ) : (
              <a href={current.url} download="visionbooth.jpg" className="rounded-full py-4 text-center font-semibold" style={{ background: gold, color: ink }}>
                Foto herunterladen
              </a>
            )}
            <p className="text-center text-xs text-white/50">
              {current.upload === "laeuft" && "Foto wird in die Event-Galerie geladen …"}
              {current.upload === "ok" && (
                <>
                  ✓ In der Event-Galerie gespeichert ·{" "}
                  <a href={`/vb/${event.slug}/galerie`} className="underline">
                    Galerie ansehen
                  </a>
                </>
              )}
              {current.upload === "fehler" && `Galerie-Upload hat nicht geklappt (${current.uploadMsg}) – dein Foto kannst du trotzdem speichern.`}
              {current.upload === "aus" && event.galleryEnabled && "Nur auf deinem Handy – nicht in der Galerie."}
            </p>
          </div>

          {event.aiStyles.length > 0 && rawRef.current && (
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-lg" style={{ color: gold }}>
                  ✨ KI-Verwandlung
                </p>
                <p className="text-xs text-white/50">{aiLeft === null ? `bis zu ${event.aiPerGuest}× pro Gast` : `noch ${aiLeft}×`}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {event.aiStyles.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => startAi(s)}
                    disabled={Boolean(aiBusy) || aiLeft === 0}
                    className="rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-medium transition active:scale-95 disabled:opacity-40"
                  >
                    <span className="mr-1.5">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
              {aiError && <p className="mt-3 text-xs text-red-300">{aiError}</p>}
            </div>
          )}

          <button onClick={again} disabled={Boolean(aiBusy)} className="w-full max-w-md rounded-full border border-white/20 py-3 font-medium text-white/90 disabled:opacity-40">
            Neues Foto
          </button>
        </section>
      )}
    </main>
  );
}

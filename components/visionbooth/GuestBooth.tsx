"use client";

import { IconTile, OccasionIcon } from "./site/OccasionIcon";
import { PhotoWheel } from "./PhotoWheel";
import { VbLogo } from "@/components/visionbooth/VbLogo";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CELL_H,
  CELL_W,
  drawCover,
  drawAiBadge,
  drawFrame,
  drawStory,
  drawStrip,
  drawStripPreview,
  FRAME_H,
  FRAME_W,
  loadVbFonts,
  preloadArt,
  onAccent,
  STORY_H,
  STORY_W,
  STRIP_H,
  STRIP_SHOTS,
  STRIP_W,
  type FrameOptions,
  type Shot,
  type VbFonts,
} from "./frame";
import { IconBack, IconCamera, IconCheck, IconFlip, IconGallery, IconRetake, IconShare, IconSparkles } from "./icons";
import type { Challenge } from "./challenges";
import { photoBody } from "./thumb";
import { LeadFormView, LeadTeaser } from "./LeadForm";
import { RevealMoment, RevealPicker, useRevealState } from "./RevealGame";
import type { RevealOption } from "./reveal";
import type { LeadField } from "./leads";
import { BoardView, MissionList, MissionWinCard, NameForm, Sheet, type BoardData, type MissionWin } from "./Missions";

interface GuestEvent {
  slug: string;
  title: string;
  frameText: string;
  template: string;
  subtext: string;
  accent: string;
  logoUrl: string | null;
  galleryEnabled: boolean;
  aiStyles: { key: string; label: string; emoji: string; waits: string[]; seconds: number }[];
  aiPerGuest: number;
  /** Formate, zwischen denen der Gast wählen kann */
  formats: Format[];
  /** Fotos werden automatisch gelöscht am (ISO-Datum) */
  deleteAfter: string;
  /** Foto-Missionen (leer = aus) */
  challenges: Challenge[];
  /** Freiwilliges Kontaktformular (Firmen-Events) */
  leads: { title: string; text: string; fields: LeadField[]; consent: string; marketing: string | null; privacyUrl: string; sponsor: string } | null;
  /** Tippspiel (Gender Reveal) */
  reveal: { question: string; options: [RevealOption, RevealOption]; result: "a" | "b" | null } | null;
  wheel?: string[] | null;
  /** Probefoto des Gastgebers: nichts wird gespeichert */
  probe?: boolean;
}

type Format = "einzel" | "streifen";

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
  const [mode, setMode] = useState<Format>(event.formats[0] ?? "einzel");
  const [busyShot, setBusyShot] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sel, setSel] = useState("original");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLeft, setAiLeft] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [waitIdx, setWaitIdx] = useState(0);
  // Foto-Missionen
  const missions = event.challenges;
  const [mission, setMission] = useState<Challenge | null>(null);
  /** Aufgabe vom Foto-Glücksrad (ohne Punkte) – gilt bis zum nächsten Foto */
  const [wheelTask, setWheelTask] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  /** Eigene Platzierung in der Bestenliste (für die Startseite) */
  const [myRank, setMyRank] = useState<{ rank: number | null; players: number } | null>(null);
  const [pending, setPending] = useState<Challenge | null>(null);
  const [sheet, setSheet] = useState<"missionen" | "name" | "bestenliste" | "kontakt" | null>(null);
  const [leadDone, setLeadDone] = useState(true);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [myName, setMyName] = useState<string | null>(null);
  const [win, setWin] = useState<MissionWin | null>(null);
  const [nudge, setNudge] = useState(0);
  // Tippspiel: eigener Tipp färbt App und Rahmen, nach der Auflösung die Ergebnis-Farbe
  const [reveal, setReveal] = useRevealState(event.slug, Boolean(event.reveal), typeof window === "undefined" ? undefined : guestKey());
  const [revealShown, setRevealShown] = useState(true);
  const revealOpt = (id: "a" | "b" | null | undefined) => event.reveal?.options.find((o) => o.id === id);
  const accent = revealOpt(reveal?.result)?.color ?? revealOpt(reveal?.mine)?.color ?? event.accent;
  useEffect(() => {
    if (!reveal?.result) return;
    try {
      const key = `vb-reveal-${event.slug}`;
      if (localStorage.getItem(key) !== reveal.result) {
        localStorage.setItem(key, reveal.result);
        setRevealShown(false);
        setConfetti((n) => n + 1);
      }
    } catch {
      setRevealShown(false);
    }
  }, [reveal?.result, event.slug]);

  async function pickTip(id: "a" | "b") {
    buzz(25);
    const res = await fetch(`/api/vb/${event.slug}/tipp`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vb-guest": guestKey() },
      body: JSON.stringify({ choice: id }),
    }).catch(() => null);
    if (res?.ok) setReveal(await res.json());
  }

  /** Mission, die mit dem nächsten Original-Upload eingereicht wird */
  const missionRef = useRef<Challenge | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const fontsRef = useRef<VbFonts | undefined>(undefined);
  const mainRef = useRef<HTMLElement>(null);
  /** Original ohne Rahmen – Grundlage für die KI, bleibt nur im Browser. */
  const rawRef = useRef<Blob | null>(null);
  /** Fotostreifen: bisherige Aufnahmen und aktuelles Feld (für die Live-Vorschau) */
  const shotsRef = useRef<Shot[]>([]);
  const shotIdxRef = useRef(0);
  const modeRef = useRef<Format>(mode);
  modeRef.current = mode;

  const opts = useCallback(
    (mirror: boolean): FrameOptions => ({
      template: event.template,
      text: event.frameText,
      subtext: event.subtext,
      accent,
      logo: logoRef.current,
      mirror,
      fonts: fontsRef.current,
    }),
    [event, accent]
  );

  // Erledigte Missionen und Spitzname vom Server holen (z. B. nach Neuladen der Seite)
  useEffect(() => {
    if (!missions.length) return;
    fetch(`/api/vb/${event.slug}/board?limit=1`, { headers: { "x-vb-guest": guestKey() }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: BoardData | null) => {
        if (b) setMyRank({ rank: b.me?.rank ?? null, players: b.players });
        if (!b?.me) return;
        setDone(new Set(b.me.done));
        if (b.me.name) setMyName(b.me.name);
      })
      .catch(() => {});
  }, [missions.length, event.slug]);

  // Kontaktformular schon ausgefüllt? (nur auf diesem Gerät gemerkt)
  useEffect(() => {
    try {
      setLeadDone(!event.leads || localStorage.getItem(`vb-lead-${event.slug}`) === "1");
    } catch {
      setLeadDone(!event.leads);
    }
  }, [event.leads, event.slug]);

  // Schriften der Vorlage fürs Canvas laden
  useEffect(() => {
    loadVbFonts(mainRef.current).then((f) => (fontsRef.current = f));
    preloadArt(event.template);
  }, [event.template]);

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
          if (v.videoWidth) {
            if (modeRef.current === "streifen") {
              drawStripPreview(ctx, { src: v, w: v.videoWidth, h: v.videoHeight }, shotsRef.current, shotIdxRef.current, opts(facing === "user"));
            } else drawFrame(ctx, v, v.videoWidth, v.videoHeight, opts(facing === "user"));
          }
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

  /** Canvas als JPEG – danach Speicher freigeben (iOS Safari zeichnet sonst irgendwann nur noch schwarz). */
  const toBlob = (c: HTMLCanvasElement, q = 0.9) =>
    new Promise<Blob | null>((r) =>
      c.toBlob((b) => {
        c.width = c.height = 0;
        r(b);
      }, "image/jpeg", q)
    );

  /** Bild aus einem Blob laden – über <img>, das ist auf iOS zuverlässiger als createImageBitmap. */
  async function loadImage(blob: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    try {
      img.src = url;
      await (img.decode ? img.decode() : new Promise((ok, err) => ((img.onload = ok), (img.onerror = err))));
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function uploadVariant(v: Variant) {
    if (!consent) return;
    setVariant(v.id, { upload: "laeuft" });
    try {
      const { body, multipart } = await photoBody(v.blob);
      const headers: Record<string, string> = { "x-vb-guest": guestKey() };
      if (!multipart) headers["content-type"] = "image/jpeg";
      if (v.style) {
        headers["x-vb-kind"] = "ki";
        headers["x-vb-style"] = v.style;
      }
      const m = v.id === "original" ? missionRef.current : null;
      if (m) headers["x-vb-challenge"] = m.id;
      const res = await fetch(`/api/vb/${event.slug}/upload`, { method: "POST", headers, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload fehlgeschlagen");
      setVariant(v.id, { upload: "ok" });
      if (m && data?.mission) {
        missionRef.current = null;
        setMission(null);
        setDone((d) => new Set(d).add(m.id));
        setWin({ emoji: m.emoji, text: m.text, points: m.points, total: data.mission.total, rank: data.mission.rank, players: data.mission.players });
        setMyRank({ rank: data.mission.rank, players: data.mission.players });
        setConfetti((n) => n + 1);
        buzz([30, 60, 30, 60, 90]);
      }
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
    setWheelTask(null);
    setConfetti((n) => n + 1);
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

  // Wartesprüche durchwechseln, solange die KI rechnet
  useEffect(() => {
    if (!aiBusy) return;
    setWaitIdx(0);
    const t = setInterval(() => setWaitIdx((i) => i + 1), 3200);
    return () => clearInterval(t);
  }, [aiBusy]);

  const buzz = (ms: number | number[]) => {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* nicht unterstützt (z. B. iPhone) */
    }
  };

  async function startAi(style: GuestEvent["aiStyles"][number]) {
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
      const aiImg = await loadImage(await img.blob());
      const c = document.createElement("canvas");
      c.width = FRAME_W;
      c.height = FRAME_H;
      drawFrame(c.getContext("2d")!, aiImg, aiImg.naturalWidth, aiImg.naturalHeight, opts(false));
      drawAiBadge(c.getContext("2d")!);
      const framed = await toBlob(c);
      if (!framed) throw new Error("Bild konnte nicht erstellt werden.");
      setConfetti((n) => n + 1);
      buzz([20, 40, 20]);
      addVariant({ id: jobId, label: `${style.emoji} ${style.label}`, style: style.key, blob: framed, url: URL.createObjectURL(framed), upload: consent ? "laeuft" : "aus" });
    } catch (e: any) {
      setAiError(e?.message || "Das hat leider nicht geklappt.");
    } finally {
      setAiBusy(null);
    }
  }

  /** Countdown n…1, danach Blitz. */
  async function countdown(n: number) {
    for (let i = n; i > 0; i--) {
      setCount(i);
      buzz(15);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCount(null);
    buzz(60);
    setFlash(true);
    setTimeout(() => setFlash(false), 450);
  }

  async function shoot() {
    if (busyShot) return;
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    setBusyShot(true);
    try {
      if (mode === "einzel") {
        await countdown(3);
        await exportFrame(v, v.videoWidth, v.videoHeight, facing === "user");
        return;
      }
      // Fotostreifen: 3 Aufnahmen hintereinander, jeweils als Streifen-Ausschnitt
      shotsRef.current = [];
      for (let i = 0; i < STRIP_SHOTS; i++) {
        shotIdxRef.current = i;
        await countdown(i === 0 ? 3 : 2);
        const c = document.createElement("canvas");
        c.width = Math.round(CELL_W * 1.25);
        c.height = Math.round(CELL_H * 1.25);
        drawCover(c.getContext("2d")!, v, v.videoWidth, v.videoHeight, 0, 0, c.width, c.height, facing === "user");
        shotsRef.current = [...shotsRef.current, { src: c, w: c.width, h: c.height }];
        await new Promise((r) => setTimeout(r, 700));
      }
      const strip = document.createElement("canvas");
      strip.width = STRIP_W;
      strip.height = STRIP_H;
      drawStrip(strip.getContext("2d")!, shotsRef.current, opts(false));
      for (const sh of shotsRef.current) (sh.src as HTMLCanvasElement).width = 0;
      shotsRef.current = [];
      shotIdxRef.current = 0;
      const blob = await toBlob(strip, 0.9);
      if (blob) finish(blob, null);
    } finally {
      setBusyShot(false);
    }
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

  /** Story-Version (9:16) erst beim Antippen erzeugen und teilen bzw. speichern. */
  async function shareStory() {
    if (!current) return;
    try {
      const img = await loadImage(current.blob);
      const c = document.createElement("canvas");
      c.width = STORY_W;
      c.height = STORY_H;
      drawStory(c.getContext("2d")!, img, img.naturalWidth, img.naturalHeight, event.accent);
      const blob = await toBlob(c, 0.9);
      if (!blob) return;
      const file = new File([blob], "visionbooth-story.jpg", { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    } catch {
      /* abgebrochen */
    }
  }

  /** Mission auswählen: erst Galerie-Freigabe und Spitzname, dann direkt zur Kamera. */
  function pickMission(c: Challenge) {
    if (!consent) {
      buzz(80);
      setNudge((n) => n + 1);
      return;
    }
    if (!myName) {
      setPending(c);
      setSheet("name");
      return;
    }
    startMission(c);
  }

  function startMission(c: Challenge) {
    missionRef.current = c;
    setMission(c);
    setSheet(null);
    setWin(null);
    buzz(20);
    if (step === "ergebnis") again();
    else setStep("kamera");
  }

  async function saveName(name: string): Promise<string | null> {
    const res = await fetch(`/api/vb/${event.slug}/guest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-vb-guest": guestKey() },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) return data?.error || "Das hat nicht geklappt – versuch es nochmal.";
    setMyName(data.name);
    if (pending) startMission(pending);
    else setSheet(null);
    setPending(null);
    return null;
  }

  function cancelMission() {
    missionRef.current = null;
    setMission(null);
  }

  function again() {
    if (aiBusy) return;
    setWin(null);
    variants.forEach((v) => URL.revokeObjectURL(v.url));
    setVariants([]);
    rawRef.current = null;
    setAiError(null);
    if (fileRef.current) fileRef.current.value = "";
    setStep("kamera");
  }

  const gold = accent;
  const ink = onAccent(gold);
  const busyStyle = event.aiStyles.find((s) => s.key === aiBusy);
  const backToStart = () => {
    stopCamera();
    setStep("start");
  };

  return (
    <main
      ref={mainRef}
      className="vb flex flex-col"
      style={{ ["--a" as string]: gold, ["--ink" as string]: ink, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="vb-aurora" aria-hidden />
      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => fromFile(e.target.files?.[0])} />
      {confetti > 0 && <Confetti key={confetti} />}
      {event.probe && (
        <div className="relative z-20 mx-auto mt-3 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-center text-[12.5px] leading-snug text-white/85 backdrop-blur">
          <strong className="text-white">Probefoto-Modus</strong> – so sehen es eure Gäste. Probefotos werden nicht gespeichert; KI und Spiele mit Punkten gibt&apos;s erst am Event.
        </div>
      )}

      {step === "start" && (
        <section className="relative mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pb-6 pt-10 text-center">
          <div className="flex flex-1 flex-col items-center justify-center">
            {event.logoUrl ? (
              <img src={event.logoUrl} alt="" className="vb-in mb-7 max-h-20 max-w-[60%] object-contain" />
            ) : (
              <span className="vb-in vb-glass mb-7 rounded-full px-4 py-2">
                <VbLogo height={16} style={{ opacity: 0.9 }} />
              </span>
            )}
            <h1 className="vb-in vb-display vb-gold-text text-[2.6rem] font-semibold leading-[1.08]" style={{ animationDelay: "80ms" }}>
              {event.frameText}
            </h1>
            <p className="vb-in mt-4 max-w-[17rem] text-[15px] leading-relaxed text-white/70" style={{ animationDelay: "160ms" }}>
              Dein Foto mit Event-Rahmen – direkt im Browser, ganz ohne App.
            </p>

            {event.aiStyles.some((s) => STYLE_PREVIEW.has(s.key)) ? (
              <StyleFan styles={event.aiStyles.filter((s) => STYLE_PREVIEW.has(s.key))} />
            ) : (
            <div className="vb-in mt-9 grid w-full grid-cols-3 gap-2" style={{ animationDelay: "240ms" }}>
              {[
                { icon: <IconCamera className="h-6 w-6" />, label: "Foto" },
                ...(event.aiStyles.length ? [{ icon: <IconSparkles className="h-6 w-6" />, label: "KI-Magie" }] : [{ icon: <IconGallery className="h-6 w-6" />, label: "Galerie" }]),
                { icon: <IconShare className="h-6 w-6" />, label: "Teilen" },
              ].map((s) => (
                <div key={s.label} className="vb-glass flex flex-col items-center gap-2 rounded-2xl py-4">
                  <span style={{ color: gold }}>{s.icon}</span>
                  <span className="text-xs font-semibold text-white/85">{s.label}</span>
                </div>
              ))}
            </div>
            )}
          </div>

          <div className="vb-in mt-8 space-y-4" style={{ animationDelay: "320ms" }}>
            {event.reveal && !reveal?.result && <RevealPicker state={reveal} options={event.reveal.options} question={event.reveal.question} onPick={pickTip} />}
            {event.reveal && reveal?.result && (
              <button onClick={() => setRevealShown(false)} className="w-full rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold" style={{ background: `color-mix(in srgb, ${accent} 30%, transparent)`, border: `1px solid ${accent}` }}>
                {revealOpt(reveal.result)?.emoji} Aufgelöst: Es wird ein {revealOpt(reveal.result)?.label}! 🎉
              </button>
            )}
            {event.wheel && (
              <button onClick={() => setWheelOpen(true)} className="vb-glass group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left">
                <span className="relative">
                  <IconTile id="wheel" />
                </span>
                <span className="relative flex-1 text-[13px] leading-snug text-white/75">
                  <span className="block text-[15px] font-semibold text-white">Foto-Glücksrad</span>
                  Dreh am Rad und mach das Foto, das es dir sagt
                </span>
                <span className="relative text-xl text-white/50">›</span>
              </button>
            )}
            {missions.length > 0 && (
              <button onClick={() => setSheet("missionen")} className="vb-glass group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left">
                <span className="vb-shimmer pointer-events-none absolute inset-0 opacity-40" />
                <span className="relative">
                  <IconTile id="target" />
                </span>
                <span className="relative flex-1 text-[13px] leading-snug text-white/75">
                  <span className="block text-[15px] font-semibold text-white">Foto-Missionen</span>
                  {done.size ? `${done.size} von ${missions.length} erledigt – weiter geht's!` : `${missions.length} Aufgaben · Punkte sammeln · Bestenliste`}
                </span>
                <span className="relative text-xl text-white/50">›</span>
              </button>
            )}
            {missions.length > 0 && myRank && myRank.players > 0 && (
              <button onClick={() => setSheet("bestenliste")} className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-white/85">
                <OccasionIcon id="trophy" className="h-4 w-4 text-[color:var(--a)]" />
                {myRank.rank ? `Du bist auf Platz ${myRank.rank} von ${myRank.players}` : `${myRank.players} ${myRank.players === 1 ? "Gast sammelt" : "Gäste sammeln"} Punkte`}
                <span className="text-white/50">· Bestenliste ansehen</span>
              </button>
            )}
            {event.galleryEnabled && (
              <button type="button" onClick={() => setConsent((c) => !c)} className="vb-glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left" aria-pressed={consent}>
                <span className="flex-1 text-[13px] leading-snug text-white/80">
                  <span className="block font-semibold text-white">In Galerie &amp; auf der Foto-Wand zeigen</span>
                  {consent ? `Deine Fotos erscheinen für die Gäste – automatisch gelöscht am ${new Date(event.deleteAfter).toLocaleDateString("de-DE")}.` : "Aus: Fotos bleiben nur auf deinem Handy."}
                </span>
                <span className="vb-switch" data-on={consent} />
              </button>
            )}
            <button onClick={() => setStep("kamera")} className="vb-btn flex w-full items-center justify-center gap-2.5 rounded-full py-[18px] text-[17px] font-bold">
              <IconCamera className="h-6 w-6" />
              Los geht&apos;s
            </button>
            <a href={`/vb/${event.slug}/datenschutz`} className="block text-[11px] text-white/45 underline underline-offset-2">
              Datenschutz · was mit deinen Fotos passiert
            </a>
          </div>
        </section>
      )}

      {step === "kamera" && (
        <section className="relative flex flex-1 flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={backToStart} disabled={busyShot} className="vb-glass flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40" aria-label="Zurück">
              <IconBack className="h-5 w-5" />
            </button>
            <span className="vb-display text-sm text-white/70">{event.frameText}</span>
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="vb-glass flex h-11 w-11 items-center justify-center rounded-full"
              aria-label="Kamera wechseln"
            >
              <IconFlip className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-3">
            <div className="relative w-full max-w-md">
              <video ref={videoRef} playsInline muted autoPlay className="hidden" />
              <canvas
                ref={canvasRef}
                width={FRAME_W}
                height={FRAME_H}
                className="mx-auto block w-full rounded-[22px] bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
                style={{ aspectRatio: `${FRAME_W}/${FRAME_H}`, maxHeight: "calc(100dvh - 210px)", objectFit: "contain" }}
              />
              {count !== null && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center">
                    <svg key={`r${count}`} viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                      <circle cx="50" cy="50" r="46" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                      <circle className="vb-ring" cx="50" cy="50" r="46" fill="none" stroke={gold} strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                    <span key={count} className="vb-count vb-display relative text-[6.5rem] font-bold leading-none text-white">
                      {count}
                    </span>
                  </div>
                </div>
              )}
              {flash && <div className="vb-flash pointer-events-none absolute inset-0 rounded-[22px] bg-white" />}
              {camError && (
                <div className="vb-glass absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[22px] p-7 text-center">
                  <IconCamera className="h-10 w-10 text-white/60" />
                  <p className="text-sm leading-relaxed text-white/80">{camError}</p>
                  {mission && (
                    <p className="rounded-full px-4 py-1.5 text-[13px] font-semibold" style={{ background: "color-mix(in srgb, var(--a) 24%, transparent)" }}>
                      {mission.emoji} {mission.text} <span style={{ color: "var(--a)" }}>+{mission.points}</span>
                    </p>
                  )}
                  <button onClick={() => fileRef.current?.click()} className="vb-btn rounded-full px-7 py-3.5 font-bold">
                    Foto aufnehmen
                  </button>
                  <button onClick={backToStart} className="text-xs text-white/55 underline">
                    Zurück
                  </button>
                </div>
              )}
            </div>
          </div>

          {!camError && (
            <div className="flex flex-col items-center gap-4 px-4 pb-5 pt-4">
              {mission ? (
                <div className="vb-chip flex max-w-full items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 text-[13px] font-semibold" style={{ background: "color-mix(in srgb, var(--a) 24%, rgba(20,20,23,0.85))", border: "1px solid color-mix(in srgb, var(--a) 55%, transparent)" }}>
                  <span className="text-base">{mission.emoji}</span>
                  <span className="truncate">{mission.text}</span>
                  <span className="flex-none font-bold" style={{ color: "var(--a)" }}>+{mission.points}</span>
                  <button onClick={cancelMission} disabled={busyShot} className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-black/30 text-xs" aria-label="Mission abbrechen">
                    ✕
                  </button>
                </div>
              ) : wheelTask ? (
                <div className="vb-chip flex max-w-full items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 text-[13px] font-semibold" style={{ background: "color-mix(in srgb, var(--a) 24%, rgba(20,20,23,0.85))", border: "1px solid color-mix(in srgb, var(--a) 55%, transparent)" }}>
                  <OccasionIcon id="wheel" className="h-4 w-4 flex-none text-[color:var(--a)]" />
                  <span className="truncate">{wheelTask}</span>
                  <button onClick={() => setWheelTask(null)} disabled={busyShot} className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-black/30 text-xs" aria-label="Aufgabe entfernen">
                    ✕
                  </button>
                </div>
              ) : (
                (missions.length > 0 || event.wheel) && (
                  <div className="flex gap-2">
                    {missions.length > 0 && (
                      <button onClick={() => setSheet("missionen")} disabled={busyShot} className="vb-glass flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white/85">
                        <OccasionIcon id="target" className="h-4 w-4 text-[color:var(--a)]" />
                        Mission wählen
                      </button>
                    )}
                    {event.wheel && (
                      <button onClick={() => setWheelOpen(true)} disabled={busyShot} className="vb-glass flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white/85">
                        <OccasionIcon id="wheel" className="h-4 w-4 text-[color:var(--a)]" />
                        Glücksrad
                      </button>
                    )}
                  </div>
                )
              )}
              {event.formats.length > 1 && (
                <div className="vb-glass flex rounded-full p-1 text-[13px] font-semibold">
                  {event.formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => setMode(f)}
                      disabled={busyShot}
                      className={`rounded-full px-4 py-1.5 transition ${mode === f ? "" : "text-white/70"}`}
                      style={mode === f ? { background: gold, color: ink } : undefined}
                    >
                      {f === "einzel" ? "Einzelfoto" : "Fotostreifen"}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={shoot}
                disabled={busyShot}
                aria-label="Auslösen"
                className="vb-shutter flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/90 disabled:opacity-60"
              >
                <span className="vb-btn block h-[66px] w-[66px] rounded-full" />
              </button>
            </div>
          )}
        </section>
      )}

      {step === "ergebnis" && current && (
        <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-5">
          <div className="vb-pop relative">
            <img src={current.url} alt="Dein Foto" className="mx-auto w-full rounded-[20px] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.95)]" style={{ maxHeight: "60dvh", objectFit: "contain" }} />
            {aiBusy && busyStyle && (
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[20px] bg-black/55 px-8 text-center backdrop-blur-[2px]">
                <div className="vb-shimmer absolute inset-0" />
                <IconSparkles className="relative h-10 w-10 animate-pulse" />
                <p key={waitIdx} className="vb-fade relative mt-4 text-[15px] font-semibold">
                  {busyStyle.waits[waitIdx % busyStyle.waits.length]}
                </p>
                <div className="vb-progress relative mt-4 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15" style={{ ["--dur" as string]: `${busyStyle.seconds * 1.15}s` }}>
                  <i />
                </div>
                <p className="relative mt-2 text-xs text-white/60">{busyStyle.emoji} {busyStyle.label} · ca. {busyStyle.seconds} Sek.</p>
              </div>
            )}
          </div>

          {win && <MissionWinCard win={win} onNext={() => setSheet("missionen")} onBoard={() => setSheet("bestenliste")} />}
          {!win && mission && current.upload === "laeuft" && <p className="vb-fade text-center text-sm text-white/70">{mission.emoji} Mission wird gewertet …</p>}

          {variants.length > 1 && (
            <div className="vb-scroll -mx-4 flex gap-2 overflow-x-auto px-4">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSel(v.id)}
                  className={`flex-none rounded-full px-4 py-2 text-[13px] font-semibold transition ${v.id === current.id ? "" : "vb-glass text-white/80"}`}
                  style={v.id === current.id ? { background: gold, color: ink } : undefined}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <div className="vb-in flex items-center gap-3" style={{ animationDelay: "150ms" }}>
            {canShare ? (
              <button onClick={share} className="vb-btn flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[16px] font-bold">
                <IconShare className="h-5 w-5" /> Speichern &amp; teilen
              </button>
            ) : (
              <a href={current.url} download="visionbooth.jpg" className="vb-btn flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[16px] font-bold">
                <IconShare className="h-5 w-5" /> Foto speichern
              </a>
            )}
            <button onClick={again} disabled={Boolean(aiBusy)} className="vb-glass flex h-[56px] w-[56px] flex-none items-center justify-center rounded-full disabled:opacity-40" aria-label="Neues Foto">
              <IconRetake className="h-6 w-6" />
            </button>
          </div>

          <button onClick={shareStory} className="vb-glass -mt-1 flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white/90">
            <span className="inline-block h-4 w-[9px] rounded-[3px] border-[1.5px] border-current" aria-hidden />
            Als Story teilen (Instagram &amp; WhatsApp)
          </button>

          {event.leads && !leadDone && <LeadTeaser lead={event.leads} onOpen={() => setSheet("kontakt")} />}

          <p className="-mt-2 text-center text-xs text-white/55">
            {current.upload === "laeuft" && "Wird in die Event-Galerie geladen …"}
            {current.upload === "ok" && (
              <a href={`/vb/${event.slug}/galerie`} className="inline-flex items-center gap-1.5">
                <span style={{ color: gold }}><IconCheck className="h-4 w-4" /></span>
                In der Event-Galerie · <span className="underline underline-offset-2">ansehen</span>
              </a>
            )}
            {current.upload === "fehler" && `Galerie-Upload hat nicht geklappt (${current.uploadMsg}) – speichern geht trotzdem.`}
            {current.upload === "aus" && event.galleryEnabled && "Nur auf deinem Handy – nicht in der Galerie."}
          </p>

          {event.aiStyles.length > 0 && !rawRef.current && (
            <p className="vb-glass rounded-2xl px-4 py-3 text-center text-xs text-white/70">
              Lust auf eine KI-Verwandlung? Die gibt&apos;s beim <strong className="text-white">Einzelfoto</strong>.
            </p>
          )}
          {event.aiStyles.length > 0 && rawRef.current && (
            <div className="vb-in" style={{ animationDelay: "250ms" }}>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="vb-display text-xl font-semibold">KI-Verwandlung</p>
                  <p className="text-xs text-white/55">
                    Tippe einen Stil an – dein Foto wird dafür an unseren KI-Dienstleister übertragen.{" "}
                    <a href={`/vb/${event.slug}/datenschutz`} className="underline underline-offset-2">Mehr</a>
                  </p>
                </div>
                <span className="vb-glass rounded-full px-3 py-1 text-xs font-semibold text-white/80">
                  {aiLeft === null ? `${event.aiPerGuest}× frei` : `noch ${aiLeft}×`}
                </span>
              </div>
              <div className="vb-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {event.aiStyles.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => startAi(s)}
                    disabled={Boolean(aiBusy) || aiLeft === 0}
                    className="relative flex h-[160px] w-[128px] flex-none flex-col justify-end overflow-hidden rounded-2xl p-3 text-left ring-1 ring-white/10 transition active:scale-95 disabled:opacity-40"
                    style={{ background: STYLE_BG[s.key] ?? STYLE_BG.default }}
                  >
                    {STYLE_PREVIEW.has(s.key) && (
                      <img src={`/visionbooth/stile/${s.key}.webp`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    {STYLE_PREVIEW.has(s.key) && <span className="absolute left-2 top-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">Beispiel</span>}
                    {aiBusy === s.key && <span className="vb-shimmer absolute inset-0" />}
                    <span className="relative text-[13px] font-bold leading-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
                      {s.emoji} {s.label}
                    </span>
                  </button>
                ))}
              </div>
              {aiError && <p className="vb-fade mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200">{aiError}</p>}
            </div>
          )}
        </section>
      )}

      {reveal?.result && !revealShown && <RevealMoment state={reveal} onClose={() => setRevealShown(true)} />}

      {wheelOpen && event.wheel && (
        <PhotoWheel
          items={event.wheel}
          onClose={() => setWheelOpen(false)}
          onDone={(task) => {
            setWheelOpen(false);
            setWheelTask(task);
            if (step === "ergebnis") again();
            else setStep("kamera");
          }}
        />
      )}

      {sheet === "missionen" && (
        <Sheet title="Foto-Missionen" onClose={() => setSheet(null)}>
          <MissionList
            missions={missions}
            done={done}
            active={mission?.id ?? null}
            consent={consent}
            nudge={nudge}
            onConsent={() => setConsent(true)}
            onPick={pickMission}
            onBoard={() => setSheet("bestenliste")}
          />
        </Sheet>
      )}
      {sheet === "name" && (
        <Sheet title="Dein Name" onClose={() => setSheet(null)}>
          <NameForm initial={myName ?? ""} onSave={saveName} />
        </Sheet>
      )}
      {sheet === "kontakt" && event.leads && (
        <Sheet title="Mitmachen" onClose={() => setSheet(null)}>
          <LeadFormView
            slug={event.slug}
            guest={guestKey()}
            lead={event.leads}
            onDone={() => {
              setLeadDone(true);
              setSheet(null);
            }}
          />
        </Sheet>
      )}
      {sheet === "bestenliste" && (
        <Sheet title="Bestenliste" onClose={() => setSheet(null)}>
          <BoardView slug={event.slug} guest={guestKey()} />
        </Sheet>
      )}
    </main>
  );
}

/** Stile mit Beispielbild (fiktive Personen, erzeugt mit denselben Einstellungen wie in der App) */
const STYLE_PREVIEW = new Set(["glamour", "superheld", "animation", "comic", "vintage", "neon", "business", "weihnachten"]);

/** Farbverläufe der KI-Stil-Karten (Platzhalter, bis das Bild geladen ist) */
const STYLE_BG: Record<string, string> = {
  glamour: "linear-gradient(160deg, #3a1d10 0%, #8a1c1c 55%, #d4a24c 120%)",
  superheld: "linear-gradient(160deg, #0b1630 0%, #1e3a8a 55%, #c4933f 130%)",
  animation: "linear-gradient(160deg, #3b1d6e 0%, #7c3aed 55%, #f59e0b 125%)",
  comic: "linear-gradient(160deg, #7a0f2e 0%, #e11d48 55%, #facc15 125%)",
  vintage: "linear-gradient(160deg, #3d2410 0%, #b45309 55%, #fcd34d 125%)",
  neon: "linear-gradient(160deg, #1e0b3a 0%, #c026d3 55%, #22d3ee 125%)",
  business: "linear-gradient(160deg, #0f172a 0%, #334155 60%, #94a3b8 130%)",
  weihnachten: "linear-gradient(160deg, #0d2e1c 0%, #166534 55%, #dc2626 125%)",
  default: "linear-gradient(160deg, #1f2937 0%, #4b5563 100%)",
};

/** Kleiner Konfetti-Regen beim fertigen Foto */
function Confetti() {
  const colors = ["var(--a)", "#ffffff", "#f5d58a", "#e9e4d8"];
  const pieces = Array.from({ length: 34 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    x: `${((i * 53) % 60) - 30}vw`,
    r: `${360 + ((i * 97) % 540)}deg`,
    d: `${1.8 + ((i * 13) % 12) / 10}s`,
    delay: `${((i * 7) % 10) / 25}s`,
    c: colors[i % colors.length],
  }));
  return (
    <div className="vb-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: p.left, background: p.c, ["--x" as string]: p.x, ["--r" as string]: p.r, ["--d" as string]: p.d, ["--delay" as string]: p.delay }} />
      ))}
    </div>
  );
}

/** Startseite: Fächer aus Original + KI-Stilen, der Stil vorne wechselt alle paar Sekunden. */
function StyleFan({ styles }: { styles: { key: string; label: string; emoji: string }[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (styles.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % styles.length), 2600);
    return () => clearInterval(t);
  }, [styles.length]);
  const cur = styles[i % styles.length];
  return (
    <div className="vb-in mt-8 w-full" style={{ animationDelay: "240ms" }}>
      <div className="relative mx-auto h-[178px] w-[260px]">
        <figure className="absolute left-2 top-3 h-[160px] w-[128px] -rotate-[7deg] overflow-hidden rounded-2xl shadow-[0_18px_40px_-14px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
          <img src="/visionbooth/stile/original.webp" alt="" className="h-full w-full object-cover" />
          <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">Dein Foto</figcaption>
        </figure>
        <span className="absolute left-1/2 top-[70px] z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full text-[var(--ink)] shadow-lg" style={{ background: "var(--a)" }}>
          <IconSparkles className="h-5 w-5" />
        </span>
        <figure className="absolute right-2 top-0 z-10 h-[170px] w-[136px] rotate-[6deg] overflow-hidden rounded-2xl shadow-[0_22px_50px_-14px_rgba(0,0,0,0.95)] ring-1 ring-white/20">
          <img key={cur.key} src={`/visionbooth/stile/${cur.key}.webp`} alt="" className="vb-fade h-full w-full object-cover" />
          <figcaption className="absolute bottom-2 left-2 right-2 truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            {cur.emoji} {cur.label}
          </figcaption>
        </figure>
      </div>
      <p className="mt-3 text-[13px] text-white/60">Foto machen · mit KI verwandeln · teilen</p>
    </div>
  );
}

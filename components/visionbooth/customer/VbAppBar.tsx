"use client";

import { useEffect, useState } from "react";
import { OccasionIcon } from "@/components/visionbooth/site/OccasionIcon";

// Kundenbereich als Web-App: „Als App speichern“ (eigenes Symbol) und Mitteilungen aufs Handy.
// iPhone: Mitteilungen funktionieren nur, wenn die Seite als App auf dem Home-Bildschirm liegt (ab iOS 16.4).

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function VbAppBar({ token }: { token: string }) {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [push, setPush] = useState<"unsupported" | "off" | "on" | "denied" | "busy">("unsupported");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const sa = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(sa);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/vb-sw.js", { scope: "/vb/verwalten/" })
        .then(async (reg) => {
          if (!("PushManager" in window) || !VAPID) return;
          if (Notification.permission === "denied") return setPush("denied");
          const sub = await reg.pushManager.getSubscription();
          setPush(sub ? "on" : "off");
        })
        .catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (prompt) {
      await prompt.prompt();
      setPrompt(null);
    } else setShowIosHelp(true);
  }

  async function togglePush() {
    setMsg(null);
    const reg = await navigator.serviceWorker.getRegistration("/vb/verwalten/");
    if (!reg) return setMsg("Bitte Seite neu laden und nochmal versuchen.");
    if (push === "on") {
      setPush("busy");
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/vb/verwalten/${token}/push`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      return setPush("off");
    }
    setPush("busy");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setPush(perm === "denied" ? "denied" : "off");
      return;
    }
    try {
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) });
      const res = await fetch(`/api/vb/verwalten/${token}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setPush("on");
      setMsg("Mitteilungen sind an – eine Test-Mitteilung ist unterwegs.");
    } catch {
      setPush("off");
      setMsg("Das hat nicht geklappt – bitte nochmal versuchen.");
    }
  }

  // iPhone ohne Home-Bildschirm: Mitteilungen erst nach dem Speichern als App möglich
  const pushNeedsInstall = ios && !standalone;
  const pushPossible = push !== "unsupported" && !pushNeedsInstall;

  return (
    <div className="vb-glass mt-6 rounded-2xl p-4 text-white">
      <div className="flex flex-wrap items-center gap-2">
        {standalone ? (
          <span className="rounded-full bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200">✓ Als App gespeichert</span>
        ) : (
          <button onClick={install} className="vb-btn inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold">
            <OccasionIcon id="phone" className="h-4 w-4" /> Als App speichern
          </button>
        )}
        {pushPossible && (
          <button
            onClick={togglePush}
            disabled={push === "busy" || push === "denied"}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${push === "on" ? "bg-white text-[#0d0d0f]" : "bg-white/10"}`}
          >
            {push === "on" ? "🔔 Mitteilungen an" : push === "denied" ? "🔕 Mitteilungen blockiert" : push === "busy" ? "…" : "🔔 Mitteilungen aktivieren"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-white/60">
        {pushNeedsInstall
          ? "Tipp: Erst als App speichern – dann können wir euch neue Fotos und Tipps direkt aufs iPhone melden."
          : push === "denied"
            ? "Mitteilungen sind in den Handy-Einstellungen für diese Seite blockiert."
            : "Eigenes App-Symbol auf dem Handy – und auf Wunsch eine Mitteilung bei neuen Fotos und Tipps."}
      </p>
      {msg && <p className="mt-1 text-xs text-white/80">{msg}</p>}

      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowIosHelp(false)}>
          <div className="vb-sheet w-full max-w-md rounded-t-[28px] bg-[#141417] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white" onClick={(e) => e.stopPropagation()}>
            <p className="vb-display text-2xl font-semibold">Als App speichern</p>
            {ios ? (
              <ol className="mt-4 space-y-3 text-[15px] text-white/85">
                <li>
                  1. Unten in Safari auf <strong>Teilen</strong> tippen <span className="ml-1 inline-block rounded border border-white/40 px-1.5 text-xs">⬆︎</span>
                </li>
                <li>
                  2. <strong>„Zum Home-Bildschirm“</strong> wählen
                </li>
                <li>
                  3. Oben rechts auf <strong>„Hinzufügen“</strong> tippen
                </li>
              </ol>
            ) : (
              <p className="mt-4 text-[15px] text-white/85">
                Im Browser-Menü (⋮) auf <strong>„App installieren“</strong> bzw. <strong>„Zum Startbildschirm hinzufügen“</strong> tippen.
              </p>
            )}
            <p className="mt-4 text-sm text-white/60">Danach findet ihr eure VisionBooth wie eine App auf dem Handy – mit eigenem Symbol.</p>
            <button onClick={() => setShowIosHelp(false)} className="vb-btn mt-6 w-full rounded-full py-3.5 font-bold">
              Alles klar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

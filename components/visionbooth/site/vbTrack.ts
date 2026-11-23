"use client";

import { useEffect } from "react";
import type { VbFunnelStep, VbSource } from "@/lib/vb-funnel";

// Jeder Schritt wird pro Seitenaufruf höchstens einmal gezählt – nichts auf dem Gerät gespeichert.
const sent = new Set<string>();

function source(): { q: VbSource; k: string } {
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("von") === "website") return { q: "website", k: "" };
    if (p.get("von") === "galerie") return { q: "galerie", k: "" };
    if (p.get("gclid") || p.get("gbraid") || p.get("wbraid") || /cpc|paid|ads/i.test(p.get("utm_medium") ?? "")) return { q: "ads", k: (p.get("utm_campaign") ?? "").slice(0, 50) };
    const ref = document.referrer ? new URL(document.referrer).host : "";
    if (!ref) return { q: "direkt", k: "" };
    if (ref.endsWith("fotobox-essen.com")) return { q: "website", k: "" };
    if (/(^|\.)(google|bing|duckduckgo|ecosia|yahoo|startpage)\./.test(ref)) return { q: "suche", k: "" };
    if (/(instagram|facebook|tiktok|pinterest|linkedin|t\.co|whatsapp)/.test(ref)) return { q: "social", k: "" };
    return { q: "andere", k: "" };
  } catch {
    return { q: "andere", k: "" };
  }
}

export function vbTrack(step: VbFunnelStep) {
  if (typeof window === "undefined" || sent.has(step)) return;
  sent.add(step);
  try {
    const { q, k } = source();
    const body = JSON.stringify({ s: step, q, k, p: location.pathname });
    if (!navigator.sendBeacon?.("/api/vb/funnel", new Blob([body], { type: "text/plain" }))) {
      fetch("/api/vb/funnel", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    }
  } catch {
    /* egal */
  }
}

/** Besuch auf einer VisionBooth-Seite zählen (nicht, wenn man nur innerhalb der Seite weiterklickt). */
export function VbVisit() {
  useEffect(() => {
    let internal = false;
    try {
      internal = Boolean(document.referrer) && new URL(document.referrer).host === location.host;
    } catch {
      /* egal */
    }
    if (!internal) vbTrack("vb_besuch");
  }, []);
  return null;
}

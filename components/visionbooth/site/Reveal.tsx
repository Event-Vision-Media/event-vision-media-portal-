"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Blendet Inhalte beim Scrollen sanft ein. Ohne JavaScript (oder bei „Bewegung reduzieren“)
 * ist alles sofort sichtbar – versteckt wird nur, was beim Laden noch unterhalb des Bildschirms liegt.
 */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // schon sichtbar
    setState("hidden");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${state === "static" ? "" : "vb-reveal"} ${state === "shown" ? "vb-reveal-in" : ""} ${className}`} style={state === "shown" ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

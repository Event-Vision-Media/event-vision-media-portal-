"use client";

import { useEffect, useRef, useState } from "react";
import type { GameCategory } from "@/lib/guestbook-game";

const C = 160;
const RING = 98;
const STEP = 60;
const norm = (d: number) => ((d % 360) + 360) % 360;
const indexAt = (r: number) => Math.round(norm(-r) / STEP) % 6;

const CSS = `
.gbd{--night:#17181c;--ivory:#f1e8d6;--ink:#2a2622;--brass:#c9a35a;--brass-deep:#8a6a2e;--muted:#9a958c;--line:#34353d;
  color:var(--ivory);font-family:var(--vb-font-ui),system-ui,sans-serif;display:flex;flex-direction:column;gap:22px}
.gbd h1{font-family:var(--vb-font-display),Georgia,serif;font-weight:600;font-size:clamp(26px,7vw,32px);line-height:1.15;margin:4px 0 0;text-wrap:balance}
.gbd .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brass)}
.gbd .sub{color:var(--muted);font-size:15px;margin:6px 0 0}
.gbd header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.gbd .sound{flex:none;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:999px;padding:7px 12px;font:600 13px var(--vb-font-ui),sans-serif;cursor:pointer}
.gbd .sound[aria-pressed="true"]{color:var(--ivory);border-color:var(--brass-deep)}
.gbd svg.dial{width:min(100%,340px);height:auto;display:block;margin:0 auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.gbd svg.dial:focus-visible{outline:2px solid var(--brass);outline-offset:6px;border-radius:50%}
.gbd .hole-ring{fill:#101115;stroke:#3a3b44;stroke-width:1.5;transition:stroke .3s,fill .3s}
.gbd .hole.on .hole-ring{fill:#2e2716;stroke:var(--brass);stroke-width:3}
.gbd .hole-label{font:800 11.5px var(--vb-font-ui),sans-serif;fill:var(--ivory);text-anchor:middle;dominant-baseline:middle}
.gbd .hole.on .hole-label{fill:var(--brass)}
.gbd .plate-text{font-family:var(--vb-font-display),Georgia,serif;fill:var(--ink);text-anchor:middle}
.gbd .spin{appearance:none;border:0;cursor:pointer;width:100%;background:linear-gradient(180deg,#d9b56c,var(--brass) 55%,var(--brass-deep));color:#1b1712;font:800 18px var(--vb-font-ui),sans-serif;padding:16px 20px;border-radius:16px;box-shadow:0 1px 0 rgba(255,255,255,.35) inset,0 10px 24px -10px rgba(201,163,90,.6);transition:transform .15s,filter .2s}
.gbd .spin:active{transform:scale(.98)}
.gbd .spin:disabled{filter:grayscale(.6) brightness(.7);cursor:default}
.gbd .card{background:var(--ivory);color:var(--ink);border-radius:18px;padding:22px 20px 20px;box-shadow:0 20px 40px -18px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:14px}
.gbd .card.reveal{animation:gbd-deal .55s cubic-bezier(.2,.9,.3,1.2)}
@keyframes gbd-deal{from{opacity:0;transform:translateY(18px) rotate(-2deg) scale(.96)}to{opacity:1;transform:none}}
.gbd .chip{align-self:flex-start;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brass-deep);border:1.5px solid currentColor;border-radius:999px;padding:3px 10px}
.gbd .task{font-family:var(--vb-font-display),Georgia,serif;font-size:clamp(21px,5.6vw,25px);line-height:1.3;margin:0;text-wrap:balance}
.gbd .card.idle .task{color:#6b645b}
.gbd .steps{list-style:none;margin:0;padding:12px 0 0;border-top:1px dashed #cbbfa8;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.gbd .steps li{font-size:13px;line-height:1.3;font-weight:600;color:#5d564d;display:flex;flex-direction:column;gap:4px;min-width:0}
.gbd .steps b{font-family:var(--vb-font-display),Georgia,serif;font-size:20px;color:var(--brass-deep)}
.gbd .again{appearance:none;border:1.5px solid var(--ink);background:transparent;color:var(--ink);border-radius:12px;padding:11px 14px;font:700 15px var(--vb-font-ui),sans-serif;cursor:pointer}
.gbd footer{text-align:center;color:var(--muted);font-size:12.5px}
.gbd button:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.gbd .card.reveal{animation:none}}
`;

export function GuestbookDial({ title, categories, spinUrl }: { title: string; categories: GameCategory[]; spinUrl?: string }) {
  const discRef = useRef<SVGGElement>(null);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const rot = useRef(0);
  const bags = useRef<Record<number, number[]>>({});
  const actx = useRef<AudioContext | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [sound, setSound] = useState(true);
  const [hit, setHit] = useState<number | null>(null);
  const [card, setCard] = useState<{ chip: string; text: string; n: number } | null>(null);
  const cats = categories.slice(0, 6);

  const holes = cats.map((_, i) => {
    const a = ((i * STEP - 90) * Math.PI) / 180;
    return { x: C + RING * Math.cos(a), y: C + RING * Math.sin(a) };
  });

  function setRot(r: number) {
    discRef.current?.setAttribute("transform", `rotate(${r} ${C} ${C})`);
    labelRefs.current.forEach((t, i) => t?.setAttribute("transform", `rotate(${-r} ${holes[i].x} ${holes[i].y})`));
  }
  useEffect(() => setRot(rot.current));

  function audio() {
    try {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (!actx.current && Ctor) actx.current = new Ctor();
      return actx.current;
    } catch {
      return null;
    }
  }
  function tick() {
    if (sound) {
      const a = audio();
      if (a) {
        const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
        o.type = "square"; o.frequency.value = 1800;
        g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.035);
      }
    }
    try { navigator.vibrate?.(6); } catch { /* iPhone: keine Vibration im Browser */ }
  }
  function ding() {
    const a = sound ? audio() : null;
    if (!a) return;
    [880, 1320].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.09;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.55);
    });
  }

  function confetti(reduce: boolean) {
    const cv = canvasRef.current, svg = discRef.current?.ownerSVGElement;
    if (reduce || !cv || !svg) return;
    const cx = cv.getContext("2d");
    if (!cx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const box = svg.getBoundingClientRect();
    const ox = box.left + box.width / 2, oy = box.top + box.height / 2;
    const cols = ["#c9a35a", "#e6c784", "#f1e8d6", "#8a6a2e", "#d97b5f"];
    const ps = Array.from({ length: 90 }, () => {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 7;
      return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: Math.random() * 6, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, s: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] };
    });
    const t0 = performance.now();
    const step = (now: number) => {
      const el = now - t0;
      cx.clearRect(0, 0, innerWidth, innerHeight);
      cx.globalAlpha = Math.max(0, 1 - el / 1600);
      ps.forEach((p) => {
        p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.s;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
      });
      if (el < 1600) requestAnimationFrame(step); else cx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(step);
  }

  function draw(i: number) {
    const tasks = cats[i][2];
    if (!bags.current[i]?.length) bags.current[i] = tasks.map((_, j) => j).sort(() => Math.random() - 0.5);
    return tasks[bags.current[i].pop()!];
  }

  function spin() {
    if (spinning || !cats.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSpinning(true); setHit(null);
    audio()?.resume?.();
    const target = Math.floor(Math.random() * cats.length);
    const jitter = (Math.random() - 0.5) * 30;
    const base = rot.current - norm(rot.current);
    const end = base - target * STEP + jitter + 360 * (reduce ? 2 : 4 + Math.floor(Math.random() * 2));
    const from = rot.current, dur = reduce ? 600 : 3600 + Math.random() * 600, t0 = performance.now();
    let last = indexAt(from);
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      rot.current = from + (end - from) * ease(p);
      setRot(rot.current);
      const idx = indexAt(rot.current);
      if (idx !== last) { last = idx; tick(); }
      if (p < 1) { requestAnimationFrame(frame); return; }
      setSpinning(false); setHit(target); ding(); confetti(reduce);
      setCard((c) => ({ chip: cats[target][1], text: draw(target), n: (c?.n ?? 0) + 1 }));
      if (spinUrl) fetch(spinUrl, { method: "POST", keepalive: true }).catch(() => {});
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }), 120);
    };
    requestAnimationFrame(frame);
  }

  return (
    <div className="gbd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }} />
      <header>
        <div>
          <div className="eyebrow">Audiogästebuch</div>
          <h1>{title}</h1>
          <p className="sub">Keine Idee, was du aufs Band sprechen sollst? Dreh an der Wählscheibe.</p>
        </div>
        <button className="sound" type="button" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
          {sound ? "Ton an" : "Ton aus"}
        </button>
      </header>

      <svg
        className="dial"
        viewBox="0 0 320 320"
        role="button"
        tabIndex={0}
        aria-label="Wählscheibe drehen"
        onClick={spin}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); } }}
      >
        <defs>
          <radialGradient id="gbd-brass" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#e6c784" /><stop offset=".55" stopColor="#c9a35a" /><stop offset="1" stopColor="#7a5c26" />
          </radialGradient>
          <radialGradient id="gbd-disc" cx="40%" cy="35%" r="75%">
            <stop offset="0" stopColor="#34353e" /><stop offset="1" stopColor="#1a1b20" />
          </radialGradient>
          <radialGradient id="gbd-plate" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fbf4e6" /><stop offset="1" stopColor="#e2d5bb" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={157} fill="url(#gbd-brass)" />
        <circle cx={C} cy={C} r={147} fill="#121317" />
        <g ref={discRef}>
          <circle cx={C} cy={C} r={144} fill="url(#gbd-disc)" />
          {cats.map((cat, i) => (
            <g key={i} className={`hole${hit === i ? " on" : ""}`}>
              <circle className="hole-ring" cx={holes[i].x} cy={holes[i].y} r={35} />
              <text ref={(el) => { labelRefs.current[i] = el; }} className="hole-label" x={holes[i].x} y={holes[i].y}>{cat[0]}</text>
            </g>
          ))}
        </g>
        <circle cx={C} cy={C} r={54} fill="url(#gbd-plate)" stroke="#a88a52" strokeWidth={2} />
        <text className="plate-text" x={C} y={153} fontSize={17}>Tippen</text>
        <text className="plate-text" x={C} y={175} fontSize={17}>&amp; drehen</text>
        <path d="M148 2 L172 2 L160 22 Z" fill="url(#gbd-brass)" stroke="#6b5020" strokeWidth={1} />
      </svg>

      <button className="spin" type="button" onClick={spin} disabled={spinning}>Wählscheibe drehen</button>

      <section ref={cardRef} key={card?.n ?? 0} className={`card${card ? " reveal" : " idle"}`} aria-live="polite">
        <span className="chip">{card ? card.chip : "So geht’s"}</span>
        <p className="task">{card ? card.text : "Dreh an der Wählscheibe – hier erscheint deine Aufgabe fürs Gästebuch."}</p>
        <ol className="steps" aria-label="Ablauf am Telefon">
          <li><b>1</b>Hörer abheben</li>
          <li><b>2</b>Ansage abwarten</li>
          <li><b>3</b>Nach dem Piep sprechen</li>
        </ol>
        {card && <button className="again" type="button" onClick={spin} disabled={spinning}>Andere Aufgabe</button>}
      </section>

      <footer>Audiogästebuch von Event Vision Media</footer>
    </div>
  );
}

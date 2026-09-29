"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Unterschriftsfeld (Finger, Stift oder Maus). Schreibt die Unterschrift als
 * PNG-Data-URL in ein verstecktes Formularfeld; leer, solange nicht
 * ausreichend gezeichnet wurde.
 */
export function SignaturePad({ name, onChange }: { name: string; onChange?: (signed: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const inkLength = useRef(0);
  const [value, setValue] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#1f2227";
      inkLength.current = 0;
      setValue("");
      onChange?.(false);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    inkLength.current += Math.hypot(p.x - last.current.x, p.y - last.current.y);
    last.current = p;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const ok = inkLength.current > 60;
    setValue(ok ? canvasRef.current!.toDataURL("image/png") : "");
    onChange?.(ok);
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    inkLength.current = 0;
    setValue("");
    onChange?.(false);
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-anthracite-200 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full cursor-crosshair touch-none rounded-xl"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          aria-label="Unterschriftsfeld"
        />
        {!value && (
          <span className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-anthracite-300">
            Hier mit Finger oder Maus unterschreiben
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-4 border-b border-anthracite-200" />
      </div>
      <button type="button" onClick={clear} className="mt-2 text-xs font-medium text-anthracite-400 hover:text-anthracite-700">
        Unterschrift löschen
      </button>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-anthracite-900 px-6 py-3 text-sm font-semibold text-white hover:bg-anthracite-700">
      Drucken / als PDF sichern
    </button>
  );
}

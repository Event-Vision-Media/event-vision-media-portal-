"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-anthracite-800 px-4 py-2 text-sm font-medium text-white hover:bg-anthracite-700">
      Drucken / als PDF sichern
    </button>
  );
}

"use client";

import { useState } from "react";

/** Link mit Kopieren-Knopf (z. B. Kalender-Abo). */
export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input-field min-w-0 flex-1 font-mono text-xs" />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex-none rounded-lg bg-anthracite-800 px-3 text-sm font-medium text-white hover:bg-anthracite-700"
      >
        {copied ? "Kopiert ✓" : "Kopieren"}
      </button>
    </div>
  );
}

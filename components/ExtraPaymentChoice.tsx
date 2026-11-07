"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseExtraPaymentMethod } from "@/app/actions/booking";

/** Kunde wählt, wie er die Nachzahlung begleicht: Überweisung oder bar bei Lieferung/Abholung. */
export function ExtraPaymentChoice({ current, pickupOnly, shippingOnly, sie }: { current: "ueberweisung" | "bar" | null; pickupOnly: boolean; shippingOnly: boolean; sie: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const choose = (m: "ueberweisung" | "bar") =>
    start(async () => {
      setError(null);
      const r = await chooseExtraPaymentMethod(m);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  const opts: ["ueberweisung" | "bar", string][] = [
    ["ueberweisung", "Überweisen"],
    ...(shippingOnly ? [] : [["bar", pickupOnly ? "Bar bei Abholung" : "Bar bei Lieferung"] as ["bar", string]]),
  ];
  return (
    <div className="mt-2">
      {!current && <p className="mb-2 text-xs text-anthracite-500">{sie ? "Wie möchten Sie den Betrag bezahlen?" : "Wie möchtet ihr den Betrag bezahlen?"}</p>}
      <div className="flex flex-wrap gap-2">
        {opts.map(([m, label]) => (
          <button
            key={m}
            type="button"
            disabled={pending}
            onClick={() => choose(m)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${current === m ? "border-gold-400 bg-gold-50 text-gold-800" : "border-anthracite-200 bg-white text-anthracite-600 hover:border-gold-300"}`}
          >
            {current === m ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

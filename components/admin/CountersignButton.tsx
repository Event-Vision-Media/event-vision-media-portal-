"use client";

import { useState, useTransition } from "react";
import { countersignContract } from "@/app/actions/contract";
import { Button } from "@/components/ui/Button";

export function CountersignButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await countersignContract(bookingId);
            setError(res.error ?? null);
          })
        }
      >
        {pending ? "Speichert…" : "Gegenzeichnen"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

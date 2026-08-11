"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePremiumLayoutIncluded } from "@/app/actions/admin";

export function PremiumIncludedToggle({
  bookingId,
  included,
}: {
  bookingId: string;
  included: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await updatePremiumLayoutIncluded(bookingId, !included);
      router.refresh();
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-anthracite-500">
      <input
        type="checkbox"
        checked={included}
        onChange={toggle}
        disabled={isPending}
        className="h-3.5 w-3.5 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
      />
      Premium inklusive
    </label>
  );
}

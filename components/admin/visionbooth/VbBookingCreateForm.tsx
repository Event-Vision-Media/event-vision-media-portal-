"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createVbForBooking } from "@/app/actions/admin-visionbooth";
import type { AdminActionResult } from "@/app/actions/admin";
import { VbPlanOccasionFields, VbSetupPreview } from "@/components/admin/visionbooth/VbPlanFields";
import type { VbOccasionId, VbPlanId } from "@/components/visionbooth/packages";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-anthracite-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-anthracite-700 disabled:opacity-60">
      {pending ? "Wird eingerichtet …" : "VisionBooth einrichten"}
    </button>
  );
}

export function VbBookingCreateForm({ bookingId, plan: p0, occasion: o0, hasEmail }: { bookingId: string; plan: VbPlanId; occasion: VbOccasionId; hasEmail: boolean }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(p0);
  const [occasion, setOccasion] = useState(o0);
  const [state, action] = useActionState<AdminActionResult, FormData>(createVbForBooking.bind(null, bookingId), {});

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-anthracite-500">Noch keine digitale Fotobox zu dieser Buchung.</p>
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-anthracite-200 px-4 py-2 text-sm font-medium text-anthracite-800 hover:border-gold-400">
          + VisionBooth hinzufügen
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <VbPlanOccasionFields plan={plan} occasion={occasion} onPlan={setPlan} onOccasion={setOccasion} />
      <VbSetupPreview plan={plan} occasion={occasion} />
      <p className="text-xs text-anthracite-500">Name, Datum, Kunde und E-Mail werden aus der Buchung übernommen.</p>
      {hasEmail && (
        <label className="flex items-center gap-2 text-sm text-anthracite-700">
          <input type="checkbox" name="send_mail" defaultChecked className="h-4 w-4" /> Kunden-Link gleich per Mail schicken
        </label>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-anthracite-500 hover:underline">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

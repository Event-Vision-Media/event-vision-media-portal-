"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createVbEvent } from "@/app/actions/admin-visionbooth";
import type { AdminActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { VbSetupPreview, VbPlanOccasionFields } from "@/components/admin/visionbooth/VbPlanFields";
import type { VbOccasionId, VbPlanId } from "@/components/visionbooth/packages";

const initial: AdminActionResult = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Wird eingerichtet …" : "VisionBooth einrichten"}
    </Button>
  );
}

export function NewVbEventForm() {
  const [state, action] = useActionState(createVbEvent, initial);
  const [plan, setPlan] = useState<VbPlanId>("party");
  const [occasion, setOccasion] = useState<VbOccasionId>("geburtstag");
  return (
    <form action={action} className="space-y-4">
      <VbPlanOccasionFields plan={plan} occasion={occasion} onPlan={setPlan} onOccasion={setOccasion} />
      <div>
        <label htmlFor="vb-title" className="mb-2 block text-sm font-medium text-anthracite-600">Name des Events</label>
        <input id="vb-title" name="title" required className="input-field" placeholder="z. B. Hochzeit Anna & Max" />
      </div>
      <div>
        <label htmlFor="vb-frame" className="mb-2 block text-sm font-medium text-anthracite-600">Text im Rahmen</label>
        <input id="vb-frame" name="frame_text" maxLength={60} className="input-field" placeholder="z. B. Anna & Max" />
        <p className="mt-1 text-xs text-anthracite-400">Leer = Name des Events.</p>
      </div>
      <div>
        <label htmlFor="vb-date" className="mb-2 block text-sm font-medium text-anthracite-600">Datum</label>
        <input id="vb-date" name="event_date" type="date" className="input-field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="vb-cname" className="mb-2 block text-sm font-medium text-anthracite-600">Kunde</label>
          <input id="vb-cname" name="contact_name" className="input-field" />
        </div>
        <div>
          <label htmlFor="vb-cmail" className="mb-2 block text-sm font-medium text-anthracite-600">E-Mail</label>
          <input id="vb-cmail" name="contact_email" type="email" className="input-field" />
        </div>
      </div>
      <VbSetupPreview plan={plan} occasion={occasion} />
      <label className="flex items-center gap-2 text-sm text-anthracite-700">
        <input type="checkbox" name="send_mail" className="h-4 w-4" /> Kunden-Link gleich per Mail schicken
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit />
    </form>
  );
}

"use client";

import { CHALLENGE_SETS } from "@/components/visionbooth/challenges";
import { getOccasion, getPlan, VB_OCCASIONS, VB_PLANS, type VbOccasionId, type VbPlanId } from "@/components/visionbooth/packages";
import { getTemplate } from "@/components/visionbooth/templates";

/** Paket- und Anlass-Auswahl (Admin: neues Event, VisionBooth zur Buchung). */
export function VbPlanOccasionFields({
  plan,
  occasion,
  onPlan,
  onOccasion,
  plans = VB_PLANS.map((p) => p.id),
}: {
  plan: VbPlanId;
  occasion: VbOccasionId;
  onPlan: (p: VbPlanId) => void;
  onOccasion: (o: VbOccasionId) => void;
  plans?: VbPlanId[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="vb-plan" className="mb-2 block text-sm font-medium text-anthracite-600">Paket</label>
        <select id="vb-plan" name="plan" value={plan} onChange={(e) => onPlan(e.target.value as VbPlanId)} className="input-field">
          {VB_PLANS.filter((p) => plans.includes(p.id)).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.price} €
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="vb-occasion" className="mb-2 block text-sm font-medium text-anthracite-600">Anlass</label>
        <select id="vb-occasion" name="occasion" value={occasion} onChange={(e) => onOccasion(e.target.value as VbOccasionId)} className="input-field">
          {VB_OCCASIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Zeigt, was automatisch eingerichtet wird – damit nichts überrascht. */
export function VbSetupPreview({ plan, occasion }: { plan: VbPlanId; occasion: VbOccasionId }) {
  const p = getPlan(plan);
  const o = getOccasion(occasion);
  const t = getTemplate(o.template);
  const set = CHALLENGE_SETS.find((s) => s.id === o.challenges);
  return (
    <div className="rounded-2xl border border-anthracite-100 bg-sand-50 p-4 text-sm text-anthracite-700">
      <p className="mb-2 font-semibold text-anthracite-800">Wird automatisch eingerichtet</p>
      <ul className="space-y-1">
        <li>
          🎨 Vorlage <strong>{t.name}</strong> <span className="ml-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: t.accent }} />
        </li>
        <li>🎯 {set ? `${set.items.length} Missionen „${set.label}“` : "keine Missionen"}</li>
        <li>✨ {p.aiLimit ? `${p.aiLimit} KI-Bilder (${p.aiPerGuest} pro Gast)` : "ohne KI"}</li>
        <li>📅 Gäste-Link {p.days} Tage ab Event-Tag · Fotos {p.retentionDays} Tage gespeichert</li>
        <li>🖼️ Einzelfoto + Fotostreifen, Galerie und Foto-Wand an</li>
      </ul>
      <p className="mt-2 text-xs text-anthracite-400">Alles danach im Event oder vom Kunden selbst anpassbar.</p>
    </div>
  );
}

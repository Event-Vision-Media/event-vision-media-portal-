"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckout, stripeReady, type VbOrder } from "@/lib/visionbooth-shop";
import { getOccasion, getPlan, VB_PLANS } from "@/components/visionbooth/packages";

export interface VbShopResult {
  error?: string;
}

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").replace(/[<>]/g, "").trim().slice(0, max);

/** Bestellung anlegen und zu Stripe weiterleiten. Preis kommt immer vom Server, nie aus dem Formular. */
export async function startVbCheckout(_prev: VbShopResult, formData: FormData): Promise<VbShopResult> {
  if (!stripeReady()) return { error: "Online-Bezahlung ist gerade nicht verfügbar. Bitte melde dich kurz bei uns." };
  const planId = str(formData, "plan", 20);
  if (!VB_PLANS.some((p) => p.id === planId && !p.id.startsWith("addon"))) return { error: "Bitte ein Paket wählen." };
  const plan = getPlan(planId);
  const name = str(formData, "name", 120);
  const email = str(formData, "email", 200).toLowerCase();
  const date = str(formData, "event_date", 10);
  const frameText = str(formData, "frame_text", 60);
  if (name.length < 2) return { error: "Bitte deinen Namen angeben." };
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) return { error: "Bitte das Datum eures Events angeben." };
  if (!frameText) return { error: "Bitte einen Text für den Foto-Rahmen angeben." };
  if (formData.get("agb") !== "on") return { error: "Bitte die AGB und die Datenschutzhinweise bestätigen." };

  const occ = getOccasion(str(formData, "occasion", 20));
  const days = plan.id === "messe" ? Math.min(7, Math.max(1, Number(formData.get("event_days")) || 1)) : 1;
  const { data, error } = await createAdminClient()
    .from("vb_orders")
    .insert({
      plan: plan.id,
      occasion: occ.id,
      title: `${occ.label} · ${frameText}`.slice(0, 120),
      frame_text: frameText,
      event_date: date,
      event_days: days,
      name,
      email,
      company: str(formData, "company", 120) || null,
      amount_cents: Math.round(plan.price * 100),
    })
    .select("*")
    .single();
  if (error || !data) return { error: "Das hat nicht geklappt – bitte versuch es nochmal." };

  let url: string;
  try {
    url = await createCheckout(data as VbOrder);
  } catch (e) {
    console.error("VisionBooth-Checkout:", e);
    return { error: "Die Bezahlseite konnte nicht geöffnet werden. Bitte versuch es gleich nochmal." };
  }
  redirect(url);
}

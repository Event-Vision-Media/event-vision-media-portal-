"use server";

import { VB_CONSENT_START, VB_LEGAL_VERSION } from "@/lib/vb-legal";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckout, stripeReady, type VbOrder } from "@/lib/visionbooth-shop";
import { defaultGames, getOccasion, getPlan, relevantGames, VB_PLANS, type VbGames } from "@/components/visionbooth/packages";
import { templatesFor } from "@/components/visionbooth/templates";

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
  if (formData.get("start_now") !== "on") return { error: "Bitte bestätige den sofortigen Start – sonst können wir deine VisionBooth erst nach Ablauf der Widerrufsfrist freischalten." };
  // Nachweis der Zustimmungen (Zeitpunkt + Fassung der Texte)
  const now = new Date().toISOString();
  const consents = { version: VB_LEGAL_VERSION, agb: now, start_now: now, start_now_text: VB_CONSENT_START };

  const occ = getOccasion(str(formData, "occasion", 20));
  let games: VbGames = defaultGames(plan.id, occ.id);
  try {
    const g = JSON.parse(String(formData.get("games") ?? "{}"));
    // nur Spiele, die zum Anlass passen
    const fit = relevantGames(occ.id, plan.id);
    games = { missions: g.missions === true && fit.missions, reveal: g.reveal === true && fit.reveal, leads: g.leads === true && plan.firma && fit.leads, wheel: g.wheel === true && Boolean(fit.wheel), guestbook: g.guestbook === true && Boolean(fit.guestbook) };
  } catch {
    /* Vorauswahl behalten */
  }
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
      games,
      consents,
      // Design nur aus der Auswahl für diesen Anlass übernehmen, sonst Anlass-Vorlage
      template: templatesFor(occ.id).find((t) => t.id === str(formData, "template", 40))?.id ?? null,
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

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { vbBaseUrl } from "@/lib/visionbooth";
import { provisionVbEvent } from "@/lib/visionbooth-provision";
import { getOccasion, getPlan } from "@/components/visionbooth/packages";

// Online-Buchung visionbooth.de: Bestellung → Stripe Checkout → nach Zahlung Event einrichten.
// Stripe wird direkt über die REST-API angesprochen (kein SDK nötig). Schlüssel: STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET. Eingerichtet wird genau einmal – egal ob zuerst der Webhook oder die Danke-Seite kommt.

export interface VbOrder {
  id: string;
  plan: string;
  occasion: string;
  title: string;
  frame_text: string | null;
  event_date: string | null;
  event_days: number;
  name: string;
  email: string;
  company: string | null;
  amount_cents: number;
  template: string | null;
  games: Partial<{ missions: boolean; reveal: boolean; leads: boolean }> | null;
  status: "offen" | "wird_eingerichtet" | "bezahlt" | "abgebrochen" | "fehler";
  stripe_session_id: string | null;
  vb_event_id: string | null;
}

export const stripeReady = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const stripeTestMode = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

async function stripe(path: string, params?: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params ? new URLSearchParams(params).toString() : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? "Fehler"}`);
  return data;
}

/** Checkout-Seite bei Stripe öffnen; gibt die Weiterleitungs-URL zurück. */
export async function createCheckout(order: VbOrder): Promise<string> {
  const plan = getPlan(order.plan);
  const occ = getOccasion(order.occasion);
  const base = vbBaseUrl();
  const session = await stripe("checkout/sessions", {
    mode: "payment",
    locale: "de",
    customer_email: order.email,
    client_reference_id: order.id,
    "metadata[order_id]": order.id,
    "payment_intent_data[metadata][order_id]": order.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(order.amount_cents),
    "line_items[0][price_data][product_data][name]": `VisionBooth ${plan.label}`,
    "line_items[0][price_data][product_data][description]": `${occ.label}${order.event_date ? ` am ${new Date(order.event_date).toLocaleDateString("de-DE")}` : ""} – ${plan.summary}`,
    success_url: `${base}/vb/buchen/danke?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/vb/buchen?abbruch=${order.id}`,
  });
  await createAdminClient().from("vb_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return session.url as string;
}

/**
 * Bezahlte Bestellung einrichten (idempotent): nur wer den Status von „offen“ auf
 * „wird_eingerichtet“ setzen kann, legt das Event an.
 */
export async function fulfillOrder(sessionId: string): Promise<{ order: VbOrder | null; manageUrl?: string; error?: string }> {
  const supabase = createAdminClient();
  const { data: found } = await supabase.from("vb_orders").select("*").eq("stripe_session_id", sessionId).maybeSingle();
  const order = found as VbOrder | null;
  if (!order) return { order: null, error: "Bestellung nicht gefunden." };
  if (order.status === "bezahlt") return { order, manageUrl: await manageUrlFor(order.vb_event_id) };

  const session = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.payment_status !== "paid") return { order, error: "Die Zahlung ist noch nicht abgeschlossen." };

  const { data: locked } = await supabase
    .from("vb_orders")
    .update({ status: "wird_eingerichtet", stripe_payment_intent: session.payment_intent ?? null, paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "offen")
    .select("id")
    .maybeSingle();
  if (!locked) {
    // Läuft gerade parallel (Webhook + Danke-Seite) – kurz warten und Ergebnis lesen
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const { data } = await supabase.from("vb_orders").select("*").eq("id", order.id).maybeSingle();
      if (data?.status === "bezahlt") return { order: data as VbOrder, manageUrl: await manageUrlFor(data.vb_event_id) };
    }
    return { order, error: "Deine VisionBooth wird gerade eingerichtet – du bekommst den Link per E-Mail." };
  }

  const res = await provisionVbEvent({
    plan: getPlan(order.plan).id,
    occasion: getOccasion(order.occasion).id,
    title: order.title,
    frameText: order.frame_text,
    eventDate: order.event_date,
    eventDays: order.event_days,
    contactName: order.name,
    contactEmail: order.email,
    company: order.company,
    template: order.template,
    games: order.games && Object.keys(order.games).length ? { missions: Boolean(order.games.missions), reveal: Boolean(order.games.reveal), leads: Boolean(order.games.leads) } : undefined,
    sendMail: true,
  });
  if ("error" in res) {
    await supabase.from("vb_orders").update({ status: "fehler" }).eq("id", order.id);
    console.error("VisionBooth-Bestellung einrichten:", order.id, res.error);
    return { order, error: "Bezahlung ist angekommen, beim Einrichten gab es aber ein Problem. Wir melden uns sofort bei dir." };
  }
  await supabase.from("vb_orders").update({ status: "bezahlt", vb_event_id: res.id }).eq("id", order.id);
  return { order: { ...order, status: "bezahlt", vb_event_id: res.id }, manageUrl: res.manageUrl };
}

async function manageUrlFor(eventId: string | null): Promise<string | undefined> {
  if (!eventId) return undefined;
  const { data } = await createAdminClient().from("vb_events").select("manage_token").eq("id", eventId).maybeSingle();
  return data ? `${vbBaseUrl()}/vb/verwalten/${data.manage_token}` : undefined;
}

/** Stripe-Webhook-Signatur prüfen (Header „Stripe-Signature“: t=…,v1=…). */
export function verifyStripeSignature(payload: string, header: string | null, toleranceSec = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const sig = Buffer.from(p.slice(3), "hex");
      const exp = Buffer.from(expected, "hex");
      return sig.length === exp.length && timingSafeEqual(sig, exp);
    });
}

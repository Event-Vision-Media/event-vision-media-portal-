import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentSummary } from "@/lib/payments";
import { getOccasion, getPlan } from "@/components/visionbooth/packages";
import type { Booking } from "@/lib/types";

/** Ein Geldeingang fürs Kassenbuch. */
export interface IncomeEntry {
  date: string; // ISO-Zeitpunkt
  kind: "Anzahlung" | "Restbetrag" | "Gesamtbetrag" | "VisionBooth online";
  method: "Überweisung" | "Bar" | "Online (Stripe)" | "Zahlweg nicht angegeben";
  amount: number;
  customer: string;
  code: string;
  href: string;
  eventDate: string | null;
}

const sameMinute = (a: string, b: string) => a.slice(0, 16) === b.slice(0, 16);

/**
 * Alle Geldeingänge (als erhalten abgehakte Anzahlungen/Restbeträge + bezahlte VisionBooth-Bestellungen)
 * im Zeitraum [from, to). Beträge brutto, so wie vom Kunden gezahlt.
 */
export async function loadIncome(from: string, to: string): Promise<IncomeEntry[]> {
  const supabase = createAdminClient();
  const [{ data: rows }, { data: vb }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .or(`and(deposit_paid_at.gte.${from},deposit_paid_at.lt.${to}),and(rest_paid_at.gte.${from},rest_paid_at.lt.${to})`)
      .limit(1000),
    supabase
      .from("vb_orders")
      .select("id, title, name, company, occasion, plan, event_date, paid_at, paid_cents, amount_cents, status")
      .eq("status", "bezahlt")
      .gte("paid_at", from)
      .lt("paid_at", to)
      .limit(1000),
  ]);
  const out: IncomeEntry[] = [];
  for (const b of (rows ?? []) as Booking[]) {
    const p = await getPaymentSummary(b);
    const customer = b.customer_name || b.couple_names;
    const base = { customer, code: b.booking_code, href: `/admin/bookings/${b.id}`, eventDate: b.event_date };
    const inRange = (d: string | null) => Boolean(d && d >= from && d < to);
    const dep = p.deposit ?? 0;
    const depAt = b.deposit_paid_at as string | null;
    const restAt = b.rest_paid_at as string | null;
    const paidTotal = b.rest_paid_amount != null ? Number(b.rest_paid_amount) : p.total ?? 0;
    const restMethod = b.rest_payment_method === "bar" ? "Bar" : b.rest_payment_method === "ueberweisung" ? "Überweisung" : "Zahlweg nicht angegeben";
    // Beides gleichzeitig abgehakt (z. B. „Gesamtbetrag erhalten“) → ein Eintrag
    if (depAt && restAt && sameMinute(depAt, restAt)) {
      if (inRange(restAt)) out.push({ ...base, date: restAt, kind: "Gesamtbetrag", method: restMethod, amount: paidTotal });
      continue;
    }
    if (dep > 0 && depAt && inRange(depAt)) out.push({ ...base, date: depAt, kind: "Anzahlung", method: "Überweisung", amount: dep });
    if (restAt && inRange(restAt)) {
      const amount = Math.max(0, paidTotal - (depAt ? dep : 0));
      out.push({ ...base, date: restAt, kind: dep > 0 && depAt ? "Restbetrag" : "Gesamtbetrag", method: restMethod, amount });
    }
  }
  for (const o of vb ?? []) {
    const amount = Number(o.paid_cents ?? o.amount_cents) / 100;
    if (amount <= 0) continue; // Gratis-Codes sind kein Geldeingang
    out.push({
      date: o.paid_at,
      kind: "VisionBooth online",
      method: "Online (Stripe)",
      amount,
      customer: [o.name, o.company].filter(Boolean).join(" · ") || o.title,
      code: `VB · ${getPlan(o.plan).label} · ${getOccasion(o.occasion).label}`,
      href: "/admin/visionbooth/bestellungen",
      eventDate: o.event_date,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** „2026-11“ → Zeitraum in UTC, passend zur Berliner Monatsgrenze (Näherung über 00:00 UTC). */
export function monthRange(month: string): { from: string; to: string; label: string; prev: string; next: string } {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return { from, to, label, prev, next };
}

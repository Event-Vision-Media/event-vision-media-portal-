import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_FIELDS, parseLeadConfig } from "@/components/visionbooth/leads";

/** Lead-Einstellungen aus dem Formular lesen. */
export function leadConfigFromForm(f: FormData) {
  return parseLeadConfig({
    enabled: f.get("lead_enabled") === "on",
    title: f.get("lead_title"),
    text: f.get("lead_text"),
    fields: LEAD_FIELDS.map((x) => x.id).filter((id) => f.get(`lead_field_${id}`) === "on"),
    sponsor: f.get("lead_sponsor"),
    purpose: f.get("lead_purpose"),
  });
}

export async function listVbLeads(eventId: string) {
  const { data } = await createAdminClient()
    .from("vb_leads")
    .select("name, email, company, phone, consent_text, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}

/** CSV für Excel (Semikolon, BOM); Zellen mit = + - @ werden entschärft. */
export async function vbLeadsCsv(eventId: string): Promise<string> {
  const rows = await listVbLeads(eventId);
  const cell = (v: string | null) => {
    let s = (v ?? "").replace(/"/g, '""');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s}"`;
  };
  const head = ["Datum", "Name", "E-Mail", "Firma", "Telefon", "Einwilligung"].map(cell).join(";");
  const lines = rows.map((r) =>
    [new Date(r.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }), r.name, r.email, r.company, r.phone, r.consent_text].map(cell).join(";")
  );
  return "﻿" + [head, ...lines].join("\r\n");
}

export const csvResponseHeaders = (name: string) => ({
  "content-type": "text/csv; charset=utf-8",
  "content-disposition": `attachment; filename="${name.replace(/[^a-z0-9-]+/gi, "-")}-kontakte.csv"`,
  "cache-control": "no-store",
});

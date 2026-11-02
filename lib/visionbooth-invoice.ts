import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, vbInvoiceMail } from "@/lib/email";
import { INVOICE_BUCKET } from "@/lib/invoices";
import { createLexwareDraft, createLexwareInvoice, lexwareEnabled, lexwareKeySet } from "@/lib/lexware";
import { getOccasion, getPlan, VB_TAX } from "@/components/visionbooth/packages";

// Rechnung für eine bezahlte VisionBooth-Online-Bestellung: in Lexware anlegen (festgeschrieben),
// PDF ablegen und per E-Mail schicken. Läuft genau einmal pro Bestellung; Fehler werden am
// Auftrag gespeichert und lassen sich im Admin erneut anstoßen.

export interface VbBilling {
  name?: string | null;
  company?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}

export async function issueVbInvoice(orderId: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!lexwareEnabled()) return { ok: false, skipped: true, error: "Rechnungen sind nicht aktiv (VB_INVOICES)." };
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("vb_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Bestellung nicht gefunden." };
  if (order.status !== "bezahlt") return { ok: false, error: "Bestellung ist noch nicht bezahlt." };
  if (order.invoice_id) return { ok: true };

  // Sperre gegen doppelte Rechnungen (Webhook + Danke-Seite + Admin gleichzeitig)
  const { data: lock } = await supabase
    .from("vb_orders")
    .update({ invoice_error: "in_arbeit" })
    .eq("id", orderId)
    .is("invoice_id", null)
    .or("invoice_error.is.null,invoice_error.neq.in_arbeit")
    .select("id")
    .maybeSingle();
  if (!lock) return { ok: false, error: "Rechnung wird gerade erstellt." };

  const plan = getPlan(order.plan);
  const occ = getOccasion(order.occasion);
  const b = (order.billing ?? {}) as VbBilling;
  const amount = order.amount_cents / 100;
  const date = order.event_date ? new Date(order.event_date).toLocaleDateString("de-DE") : null;
  try {
    const inv = await createLexwareInvoice({
      name: b.company || order.company || b.name || order.name,
      supplement: b.company || order.company ? b.name || order.name : null,
      street: b.street,
      zip: b.zip,
      city: b.city,
      countryCode: b.country,
      serviceDate: order.event_date ?? new Date().toISOString().slice(0, 10),
      item: {
        name: `VisionBooth ${plan.label}`,
        description: `Digitale Fotobox für „${order.frame_text || order.title}“ – ${occ.label}${date ? ` am ${date}` : ""}. ${plan.summary}.`,
        grossAmount: amount,
      },
      taxMode: VB_TAX,
      remark: "Der Rechnungsbetrag wurde bereits online bezahlt. Vielen Dank!",
    });
    const path = `vb/${order.id}.pdf`;
    await supabase.storage.from(INVOICE_BUCKET).upload(path, inv.pdf, { contentType: "application/pdf", upsert: true });
    await supabase
      .from("vb_orders")
      .update({ invoice_id: inv.id, invoice_number: inv.number || null, invoice_path: path, invoice_error: null, invoiced_at: new Date().toISOString() })
      .eq("id", order.id);

    const mail = vbInvoiceMail({ name: order.name, title: order.frame_text || order.title, number: inv.number, amount });
    await sendEmail({ to: order.email, ...mail, attachments: [{ filename: inv.fileName, content: inv.pdf.toString("base64") }] });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("VisionBooth-Rechnung:", order.id, msg);
    await supabase.from("vb_orders").update({ invoice_error: msg.slice(0, 300) }).eq("id", order.id);
    return { ok: false, error: msg };
  }
}

/** Probe-Entwurf mit Beispieldaten (Hochzeitspaket) – zum Prüfen in Lexware, danach dort löschen. */
export async function vbInvoiceDraftTest(): Promise<{ ok: boolean; error?: string }> {
  if (!lexwareKeySet()) return { ok: false, error: "LEXWARE_API_KEY ist nicht eingetragen." };
  const plan = getPlan("hochzeit");
  try {
    await createLexwareDraft({
      name: "PROBE – bitte löschen (Anna Beispiel)",
      street: "Musterstraße 1",
      zip: "45127",
      city: "Essen",
      countryCode: "DE",
      serviceDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      item: { name: `VisionBooth ${plan.label}`, description: `Digitale Fotobox für „Anna & Max“ – Hochzeit. ${plan.summary}.`, grossAmount: plan.price },
      taxMode: VB_TAX,
      remark: "Der Rechnungsbetrag wurde bereits online bezahlt. Vielen Dank!",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

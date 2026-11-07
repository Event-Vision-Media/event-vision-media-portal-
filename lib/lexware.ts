import "server-only";

// Lexware Office Public API (https://developers.lexware.io/docs/) – nur für Rechnungen der
// VisionBooth-Online-Buchungen. Schlüssel: LEXWARE_API_KEY. Max. 2 Anfragen/Sekunde.
// Festgeschriebene Rechnungen lassen sich in Lexware nicht löschen (nur stornieren) – deshalb
// entstehen Rechnungen nur, wenn VB_INVOICES=on gesetzt ist (Test nur mit eigenem Lexware-Testkonto!).

const BASE = "https://api.lexware.io/v1";

export const lexwareEnabled = () => process.env.VB_INVOICES === "on" && Boolean(process.env.LEXWARE_API_KEY);
/** Schlüssel vorhanden – reicht für einen Probe-Entwurf (löschbar, ohne Rechnungsnummer). */
export const lexwareKeySet = () => Boolean(process.env.LEXWARE_API_KEY);

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(path: string, init: RequestInit & { accept?: string } = {}): Promise<Response> {
  const key = process.env.LEXWARE_API_KEY;
  if (!key) throw new Error("LEXWARE_API_KEY fehlt");
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: init.accept ?? "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    // Ratenlimit (429): kurz warten und erneut versuchen
    if (res.status === 429) {
      await pause(700 * (attempt + 1));
      continue;
    }
    return res;
  }
  throw new Error("Lexware: zu viele Anfragen (429)");
}

export interface LexInvoiceInput {
  /** Rechnungsempfänger – bei Kleinbetragsrechnungen (≤ 250 €) genügt der Name */
  name: string;
  supplement?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  countryCode?: string | null;
  /** Leistungsdatum (YYYY-MM-DD), z. B. Event-Tag */
  serviceDate: string;
  item: { name: string; description: string; grossAmount: number };
  /** Kleinunternehmer (§ 19 UStG): steuerfrei, 0 %; sonst Bruttopreis inkl. 19 % */
  taxMode: "kleinunternehmer" | "regel";
  introduction?: string;
  remark?: string;
}

// Mittags, damit der Tag auch bei Sommer-/Winterzeit nicht verrutscht
const isoDay = (d: string) => `${d}T12:00:00.000+01:00`;

function invoiceBody(i: LexInvoiceInput) {
  const vatfree = i.taxMode === "kleinunternehmer";
  const amount = Math.round(i.item.grossAmount * 100) / 100;
  const body = {
    voucherDate: new Date().toISOString().replace("Z", "+00:00"),
    address: {
      name: i.name.slice(0, 120),
      ...(i.supplement ? { supplement: i.supplement.slice(0, 120) } : {}),
      ...(i.street ? { street: i.street } : {}),
      ...(i.zip ? { zip: i.zip } : {}),
      ...(i.city ? { city: i.city } : {}),
      countryCode: (i.countryCode || "DE").toUpperCase(),
    },
    lineItems: [
      {
        type: "custom",
        name: i.item.name,
        description: i.item.description,
        quantity: 1,
        unitName: "Paket",
        unitPrice: vatfree
          ? { currency: "EUR", netAmount: amount, taxRatePercentage: 0 }
          : { currency: "EUR", grossAmount: amount, taxRatePercentage: 19 },
      },
    ],
    totalPrice: { currency: "EUR" },
    taxConditions: { taxType: vatfree ? "vatfree" : "gross" },
    shippingConditions: { shippingType: "service", shippingDate: isoDay(i.serviceDate) },
    ...(i.introduction ? { introduction: i.introduction } : {}),
    ...(i.remark ? { remark: i.remark } : {}),
  };
  return body;
}

/**
 * Probe: Rechnung nur als ENTWURF anlegen – ohne Rechnungsnummer, in Lexware löschbar.
 * Zum Prüfen von Text, Betrag und Kleinunternehmer-Hinweis vor dem Einschalten.
 */
export async function createLexwareDraft(i: LexInvoiceInput): Promise<{ id: string }> {
  const res = await call("/invoices", { method: "POST", body: JSON.stringify(invoiceBody(i)) });
  if (!res.ok) throw new Error(`Lexware Entwurf ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { id: string };
}

/** Rechnung festgeschrieben anlegen, Nummer lesen und PDF laden. */
export async function createLexwareInvoice(i: LexInvoiceInput): Promise<{ id: string; number: string; pdf: Buffer; fileName: string }> {
  const created = await call("/invoices?finalize=true", { method: "POST", body: JSON.stringify(invoiceBody(i)) });
  if (!created.ok) throw new Error(`Lexware Rechnung ${created.status}: ${(await created.text()).slice(0, 300)}`);
  const { id } = (await created.json()) as { id: string };

  await pause(550);
  const info = await call(`/invoices/${id}`);
  if (!info.ok) throw new Error(`Lexware Rechnung lesen ${info.status}`);
  const { voucherNumber } = (await info.json()) as { voucherNumber?: string };

  await pause(550);
  const file = await call(`/invoices/${id}/file`, { accept: "application/pdf" });
  if (!file.ok) throw new Error(`Lexware PDF ${file.status}`);
  const pdf = Buffer.from(await file.arrayBuffer());
  const disp = file.headers.get("content-disposition") ?? "";
  const fileName = /filename="?([^";]+)"?/i.exec(disp)?.[1] || `Rechnung-${voucherNumber ?? id}.pdf`;
  return { id, number: voucherNumber ?? "", pdf, fileName };
}

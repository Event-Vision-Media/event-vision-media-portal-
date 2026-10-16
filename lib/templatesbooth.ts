import { createHmac, timingSafeEqual } from "crypto";

/**
 * TemplatesBooth-Widget: Kunden personalisieren dort ein Premium-Design und
 * schicken es ab. TemplatesBooth meldet jede Einsendung per Webhook an
 * /api/webhooks/templatesbooth; hier steckt alles, was dafür nötig ist.
 */

/** Gehostete Galerie des Widgets „Portal Kunden“ (Einstellungen → Embed). */
export const TEMPLATESBOOTH_URL =
  process.env.NEXT_PUBLIC_TEMPLATESBOOTH_URL || "https://widget.templatesbooth.com/booth-ss7nmj/";

/** Platzhalter-Layout, das eine Buchung mit TemplatesBooth-Design bekommt (Migration 0025). */
export const TB_LAYOUT_NAME = "Individuelles Premium-Design";

/** Link zur Galerie; nach dem Absenden kommt der Kunde zurück ins Portal. */
export function templatesboothLink(portalUrl: string): string {
  const back = `${portalUrl.replace(/\/$/, "")}/dashboard/layout?design=gesendet`;
  return `${TEMPLATESBOOTH_URL}?tbw_return=${encodeURIComponent(back)}`;
}

/** Prüft X-TBW-Signature: sha256=<hex HMAC-SHA256 des rohen Bodys>. */
export function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const given = header.trim().replace(/^sha256=/i, "").toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
}

export interface SubmissionFields {
  externalId: string | null;
  name: string | null;
  email: string | null;
  eventDate: string | null;
  designName: string | null;
  previewUrl: string | null;
  bookingCode: string | null;
}

type Json = unknown;

/** Alle (Pfad, Wert)-Paare der Nutzlast – Pfad in Kleinbuchstaben, z. B. "request.customer.email". */
function walk(value: Json, path = "", out: [string, unknown][] = []): [string, unknown][] {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, path ? `${path}.${k.toLowerCase()}` : k.toLowerCase(), out);
    }
  } else {
    out.push([path, value]);
  }
  return out;
}

const lastKey = (path: string) => path.replace(/\[\d+\]/g, "").split(".").pop() ?? "";
const isImageUrl = (s: string) => /^https:\/\/\S+\.(png|jpe?g|webp)(\?\S*)?$/i.test(s);

/**
 * Liest die wichtigsten Angaben aus der Einsendung. Das genaue Format dokumentiert
 * TemplatesBooth nicht („full submission as JSON“) – deshalb wird nach typischen
 * Feldnamen gesucht; die komplette Nutzlast wird zusätzlich gespeichert.
 */
export function extractFields(payload: Json): SubmissionFields {
  const pairs = walk(payload).filter(([, v]) => typeof v === "string" || typeof v === "number") as [string, string | number][];
  const str = (v: string | number) => String(v).trim();
  const find = (test: (key: string, path: string, value: string) => boolean) => {
    for (const [path, v] of pairs) {
      const value = str(v);
      if (value && test(lastKey(path), path, value)) return value;
    }
    return null;
  };

  const top = (payload ?? {}) as Record<string, any>;
  const externalId =
    [top.id, top.request?.id, top.data?.id, top.submission?.id].find((v) => typeof v === "string" || typeof v === "number")?.toString() ?? null;

  const email = find((k, _p, v) => k.includes("email") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))?.toLowerCase() ?? null;
  const name =
    find((k, p) => ["name", "full_name", "fullname", "customer_name"].includes(k) && /(customer|contact|client|form|^name)/.test(p) && !/(design|template|layout|file|widget|extra)/.test(p)) ??
    find((k, p) => k === "name" && !/(design|template|layout|file|widget|extra|event)/.test(p));
  const eventDate = (() => {
    const raw = find((k) => /event.?date|^date$/.test(k));
    const m = raw?.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const de = raw?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    return de ? `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}` : null;
  })();
  const designName =
    find((k, p) => ["title", "name", "design_name", "template_name"].includes(k) && /(design|template|layout)/.test(p)) ??
    find((k) => ["design_name", "template_name", "design", "template"].includes(k) && true);
  const previewUrl =
    find((k, _p, v) => /(preview|thumb|image|png|jpg)/.test(k) && isImageUrl(v)) ?? find((_k, _p, v) => isImageUrl(v));
  const bookingCode = JSON.stringify(payload ?? "").match(/\bFB-\d{4}-\d{3,5}\b/i)?.[0]?.toUpperCase() ?? null;

  return { externalId, name, email, eventDate, designName, previewUrl, bookingCode };
}

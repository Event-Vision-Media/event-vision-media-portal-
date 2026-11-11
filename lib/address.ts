// Ansprache: Du oder Sie und die Begrüßungszeile – an einer Stelle für Mails, Portal und Angebot.
// Ohne eigene Einstellung gilt: Businesskunden werden gesiezt, Privatkunden geduzt.

export interface AddressFields {
  customer_type?: string | null;
  /** „du“ | „sie“ – überschreibt die Automatik */
  address_form?: string | null;
  /** „frau“ | „herr“ – nur für „Guten Tag Frau/Herr Nachname“ */
  salutation?: string | null;
  customer_name?: string | null;
  couple_names?: string | null;
}

export function usesSie(b: AddressFields): boolean {
  if (b.address_form === "du") return false;
  if (b.address_form === "sie") return true;
  return b.customer_type === "business";
}

/**
 * Begrüßung ohne Komma: „Guten Tag Frau Günnemann“, „Guten Tag Petra Günnemann“, „Guten Tag“ (nur Nachname
 * ohne Anrede – nie „Guten Tag Günnemann“), „Hallo Petra“ (Du: Vorname) bzw. „Hallo Anna & Max“.
 */
export function greetingLine(b: AddressFields): string {
  const name = (b.customer_name || b.couple_names || "").trim().replace(/\s+/g, " ");
  const words = name ? name.split(" ") : [];
  if (usesSie(b)) {
    const title = b.salutation === "frau" ? "Frau" : b.salutation === "herr" ? "Herr" : null;
    if (title && words.length) return `Guten Tag ${title} ${words[words.length - 1]}`;
    if (words.length > 1) return `Guten Tag ${name}`;
    return "Guten Tag";
  }
  // Du: nur der Vorname („Hallo Astrid“) – bei Paaren („Anna & Max“, „Anna und Max“) der ganze Name
  if (!name) return "Hallo";
  return /&| und /i.test(name) ? `Hallo ${name}` : `Hallo ${words[0]}`;
}

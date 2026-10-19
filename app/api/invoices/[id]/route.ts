import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBooking } from "@/lib/booking-session";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { INVOICE_BUCKET } from "@/lib/invoices";

export const dynamic = "force-dynamic";

/**
 * Rechnungs-PDF herunterladen: leitet auf einen kurzlebigen, signierten Link weiter.
 * Zugriff nur für den eingeloggten Kunden der jeweiligen Buchung oder für Admins.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const [{ data: invoice }, guestBooking, isAdmin] = await Promise.all([
    supabase.from("booking_invoices").select("booking_id, file_path, file_name").eq("id", params.id).maybeSingle(),
    getCurrentBooking(),
    isAdminAuthenticated(),
  ]);
  if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  if (guestBooking?.id !== invoice.booking_id && !isAdmin) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  }
  const { data } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(invoice.file_path, 60, { download: invoice.file_name });
  if (!data?.signedUrl) return NextResponse.json({ error: "Download nicht möglich." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

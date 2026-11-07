import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { vbClosedReason, vbGuestUrl, vbManageUrl, type VbEvent } from "@/lib/visionbooth";
import { getPlan, guessOccasion, addonPlanFor } from "@/components/visionbooth/packages";
import { Card } from "@/components/ui/Card";
import { CopyField } from "@/components/admin/CopyField";
import { VbSendManageLink } from "@/components/admin/visionbooth/VbSendManageLink";
import { VbBookingCreateForm } from "@/components/admin/visionbooth/VbBookingCreateForm";

/** VisionBooth zur Buchung: anlegen (Paket/Anlass vorbelegt) oder Status + Kunden-Link zeigen. */
export async function VbBookingCard({
  booking,
}: {
  booking: { id: string; occasion: string | null; customer_type: string | null; company: string | null; email: string | null };
}) {
  const { data } = await createAdminClient().from("vb_events").select("*").eq("booking_id", booking.id).maybeSingle();
  const e = data as (VbEvent & { plan: string | null }) | null;
  const firma = booking.customer_type === "business" || Boolean(booking.company);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-anthracite-800">📱 VisionBooth</h2>
        {e && (
          <Link href={`/admin/visionbooth/${e.id}`} className="text-sm font-medium text-gold-700 hover:underline">
            Event öffnen →
          </Link>
        )}
      </div>
      {e ? (
        <div className="space-y-3 text-sm">
          <p className="text-anthracite-600">
            Paket <strong>{getPlan(e.plan).label}</strong> · {status(e)}
          </p>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-anthracite-400">Gäste-Link</p>
            <CopyField value={vbGuestUrl(e.slug)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-anthracite-400">Kunden-Link</p>
            <CopyField value={vbManageUrl(e.manage_token)} />
          </div>
          <VbSendManageLink eventId={e.id} email={e.contact_email} />
        </div>
      ) : (
        <VbBookingCreateForm bookingId={booking.id} plan={addonPlanFor(firma)} occasion={guessOccasion(booking.occasion, firma)} hasEmail={Boolean(booking.email)} />
      )}
    </Card>
  );
}

function status(e: VbEvent): string {
  const closed = vbClosedReason(e);
  if (!closed) return "🟢 Gäste-Link aktiv";
  if (e.photos_deleted_at) return "abgeschlossen, Fotos gelöscht";
  if (closed.includes("öffnet")) return `startet am Event-Tag${e.event_date ? ` (${new Date(e.event_date).toLocaleDateString("de-DE")})` : ""}`;
  if (closed.includes("noch nicht")) return "Entwurf";
  return "beendet";
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ActivityFeed, type ActivityFeedEntry } from "@/components/admin/ActivityFeed";
import { formatDateGerman } from "@/lib/format";
import type { BookingStatus, LayoutProof } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BookingStatus, string> = {
  offen: "Offen",
  layout_ausgewaehlt: "Layout ausgewählt",
  personalisierung_komplett: "Komplett",
};

const STATUS_ORDER: Record<BookingStatus, number> = {
  offen: 0,
  layout_ausgewaehlt: 1,
  personalisierung_komplett: 2,
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createAdminClient();
  const [
    { data: bookings },
    { data: bookingExtras },
    { data: layoutProofsData },
    { data: activityData },
    { data: screenProofsData },
  ] = await Promise.all([
    supabase.from("bookings").select("*").order("event_date", { ascending: true }),
    supabase.from("booking_extras").select("booking_id, extras(category)"),
    supabase
      .from("layout_proofs")
      .select("booking_id, layout_name, status, version")
      .order("version", { ascending: false }),
    supabase
      .from("activity_log")
      .select("id, message, created_at, read_at, bookings(booking_code)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("personalized_screen_proofs")
      .select("booking_id, status")
      .order("version", { ascending: false }),
  ]);

  const latestScreenProofStatusByBooking = new Map<string, string>();
  (screenProofsData ?? []).forEach((proof: any) => {
    if (!latestScreenProofStatusByBooking.has(proof.booking_id)) {
      latestScreenProofStatusByBooking.set(proof.booking_id, proof.status);
    }
  });

  const activityEntries: ActivityFeedEntry[] = (activityData ?? []).map((entry: any) => ({
    id: entry.id,
    message: entry.message,
    created_at: entry.created_at,
    read_at: entry.read_at,
    bookingCode: entry.bookings?.booking_code ?? null,
  }));

  const personalizedScreenBookingIds = new Set<string>();
  (bookingExtras ?? []).forEach((be: any) => {
    if (be.extras?.category === "Startbildschirm") {
      personalizedScreenBookingIds.add(be.booking_id);
    }
  });

  const latestProofsByBooking = new Map<string, Map<string, LayoutProof>>();
  (layoutProofsData ?? []).forEach((proof: any) => {
    const byName = latestProofsByBooking.get(proof.booking_id) ?? new Map<string, LayoutProof>();
    if (!byName.has(proof.layout_name)) {
      byName.set(proof.layout_name, proof);
    }
    latestProofsByBooking.set(proof.booking_id, byName);
  });

  const statusFilter = searchParams.status as BookingStatus | undefined;

  const allBookings = bookings ?? [];
  const filtered = statusFilter
    ? allBookings.filter((b) => b.status === statusFilter)
    : allBookings;

  const sorted = [...filtered].sort(
    (a, b) => STATUS_ORDER[a.status as BookingStatus] - STATUS_ORDER[b.status as BookingStatus]
  );

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ActivityFeed entries={activityEntries} />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-semibold text-anthracite-800">
            Buchungen
          </h1>
          <div className="flex gap-3">
            <a href="/api/admin/export">
              <Button variant="ghost">CSV-Export (Zusatzwünsche)</Button>
            </a>
            <Link href="/admin/bookings/new">
              <Button>+ Neue Buchung</Button>
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <FilterLink status={undefined} current={statusFilter} label="Alle" />
          <FilterLink status="offen" current={statusFilter} label="Offen" />
          <FilterLink
            status="layout_ausgewaehlt"
            current={statusFilter}
            label="Layout ausgewählt"
          />
          <FilterLink
            status="personalisierung_komplett"
            current={statusFilter}
            label="Komplett"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-anthracite-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-anthracite-100 text-sm">
            <thead className="bg-anthracite-50 text-left text-xs uppercase tracking-wide text-anthracite-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Namen</th>
                <th className="px-4 py-3">Event-Datum</th>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fortschritt</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-anthracite-50">
              {sorted.map((booking) => {
                const byName = latestProofsByBooking.get(booking.id);
                const latest = byName ? Array.from(byName.values()) : [];
                const screenProofApproved =
                  latestScreenProofStatusByBooking.get(booking.id) === "freigegeben";
                const doneCount = [
                  Boolean(booking.selected_home_screen_id) ||
                    (personalizedScreenBookingIds.has(booking.id) && screenProofApproved),
                  Boolean(booking.selected_layout_id),
                  latest.length > 0 && latest.every((p) => p.status === "freigegeben"),
                  Boolean(booking.extras_confirmed_at),
                ].filter(Boolean).length;

                return (
                  <tr key={booking.id} className="hover:bg-anthracite-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-anthracite-800">
                      {booking.booking_code}
                    </td>
                    <td className="px-4 py-3 text-anthracite-800">{booking.couple_names}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-anthracite-600">
                      {formatDateGerman(booking.event_date)}
                    </td>
                    <td className="px-4 py-3 text-anthracite-600">{booking.product_type}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={booking.status === "personalisierung_komplett" ? "success" : "neutral"}
                      >
                        {STATUS_LABELS[booking.status as BookingStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={doneCount === 4 ? "success" : "neutral"}>{doneCount}/4</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-medium text-gold-700 hover:underline"
                      >
                        Öffnen →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-anthracite-400">
                    Keine Buchungen gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function FilterLink({
  status,
  current,
  label,
}: {
  status?: string;
  current?: string;
  label: string;
}) {
  const isActive = status === current;
  const href = status ? `/admin/dashboard?status=${status}` : "/admin/dashboard";
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 ${
        isActive
          ? "bg-anthracite-800 text-white"
          : "bg-white text-anthracite-500 border border-anthracite-200 hover:bg-anthracite-50"
      }`}
    >
      {label}
    </Link>
  );
}

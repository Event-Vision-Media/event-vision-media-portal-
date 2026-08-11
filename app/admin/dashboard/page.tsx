import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BookingRowActions } from "@/components/admin/BookingRowActions";
import { OnlineGalleryCell } from "@/components/admin/OnlineGalleryCell";
import { ActivityFeed, type ActivityFeedEntry } from "@/components/admin/ActivityFeed";
import { CustomLoginCodeCell } from "@/components/admin/CustomLoginCodeCell";
import { PremiumIncludedToggle } from "@/components/admin/PremiumIncludedToggle";
import { formatCurrencyEUR, formatDateGerman, formatDateTimeGerman, formatTimeGerman } from "@/lib/format";
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
    supabase
      .from("bookings")
      .select("*, layouts(name, preview_image_url), home_screens(name, preview_image_url)")
      .order("event_date", { ascending: true }),
    supabase
      .from("booking_extras")
      .select("booking_id, extra_id, price, added_by_admin, extras(name, category), extra_variants(name)"),
    supabase
      .from("layout_proofs")
      .select("*")
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

  const extrasByBooking = new Map<string, { label: string; price: number; addedByAdmin: boolean }[]>();
  const personalizedScreenBookingIds = new Set<string>();
  (bookingExtras ?? []).forEach((be: any) => {
    const label = be.extra_variants?.name
      ? `${be.extras?.name} – ${be.extra_variants.name}`
      : be.extras?.name ?? "Extra";
    const list = extrasByBooking.get(be.booking_id) ?? [];
    list.push({ label, price: be.price, addedByAdmin: be.added_by_admin });
    extrasByBooking.set(be.booking_id, list);
    if (be.extras?.category === "Startbildschirm") {
      personalizedScreenBookingIds.add(be.booking_id);
    }
  });

  const latestProofsByBooking = new Map<string, Map<string, LayoutProof>>();
  (layoutProofsData ?? []).forEach((proof: LayoutProof) => {
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

        <div className="overflow-x-auto rounded-2xl border border-anthracite-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-anthracite-100 text-sm">
            <thead className="bg-anthracite-50 text-left text-xs uppercase tracking-wide text-anthracite-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Login-Passwort</th>
                <th className="px-4 py-3">Namen</th>
                <th className="px-4 py-3">Event-Datum</th>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Startbildschirm</th>
                <th className="px-4 py-3">Layout</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Layout-Freigabe</th>
                <th className="px-4 py-3">Personalisierung (Grafik)</th>
                <th className="px-4 py-3">Zusatzwünsche (Rechnung)</th>
                <th className="px-4 py-3">Fortschritt</th>
                <th className="px-4 py-3">Online-Galerie</th>
                <th className="px-4 py-3">Google-Bewertung</th>
                <th className="px-4 py-3">Lieferung/Abholung</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-anthracite-50">
              {sorted.map((booking) => (
                <tr key={booking.id} className="align-top hover:bg-anthracite-50/50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-anthracite-800">
                    {booking.booking_code}
                  </td>
                  <td className="px-4 py-3">
                    <CustomLoginCodeCell bookingId={booking.id} code={booking.custom_login_code} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-anthracite-800">{booking.couple_names}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-anthracite-600">
                    {formatDateGerman(booking.event_date)}
                  </td>
                  <td className="px-4 py-3 text-anthracite-600">{booking.product_type}</td>
                  <td className="px-4 py-3 text-xs text-anthracite-600">
                    {booking.home_screens ? (
                      <div className="flex items-center gap-2">
                        {booking.home_screens.preview_image_url && (
                          <div className="relative h-10 w-10 flex-none overflow-hidden rounded-md border border-anthracite-100 bg-anthracite-50">
                            <Image
                              src={booking.home_screens.preview_image_url}
                              alt={booking.home_screens.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span>{booking.home_screens.name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                    {personalizedScreenBookingIds.has(booking.id) && (
                      <Link href={`/admin/startbildschirm-freigaben?booking=${booking.id}`}>
                        <Badge tone="gold" className="ml-2 hover:opacity-80">
                          Personalisiert
                        </Badge>
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-anthracite-600">
                    {booking.layouts ? (
                      <div className="flex items-center gap-2">
                        {booking.layouts.preview_image_url && (
                          <div className="relative h-10 w-10 flex-none overflow-hidden rounded-md border border-anthracite-100 bg-anthracite-50">
                            <Image
                              src={booking.layouts.preview_image_url}
                              alt={booking.layouts.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span>{booking.layouts.name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                    {booking.is_premium_selected && (
                      <Badge tone="gold" className="ml-2">
                        {booking.premium_layout_included ? "Premium · inklusive" : "Premium"}
                      </Badge>
                    )}
                    <div className="mt-1.5">
                      <PremiumIncludedToggle
                        bookingId={booking.id}
                        included={booking.premium_layout_included}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={booking.status === "personalisierung_komplett" ? "success" : "neutral"}
                    >
                      {STATUS_LABELS[booking.status as BookingStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const byName = latestProofsByBooking.get(booking.id);
                      const latest = byName ? Array.from(byName.values()) : [];
                      if (latest.length === 0) {
                        return <span className="text-anthracite-400">—</span>;
                      }
                      const approved = latest.filter((p) => p.status === "freigegeben").length;
                      const changesRequested = latest.filter(
                        (p) => p.status === "aenderungen_erforderlich"
                      ).length;
                      return (
                        <Link
                          href={`/admin/layout-freigaben?booking=${booking.id}`}
                          className="inline-flex flex-col gap-1 hover:opacity-80"
                        >
                          <Badge tone={approved === latest.length ? "success" : "neutral"}>
                            {approved}/{latest.length} freigegeben
                          </Badge>
                          {changesRequested > 0 && (
                            <Badge tone="gold">{changesRequested} Änderung(en) angefordert</Badge>
                          )}
                        </Link>
                      );
                    })()}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-anthracite-600">
                    {booking.personalization_name || booking.personalization_date || booking.extra_wishes ? (
                      <div className="space-y-0.5">
                        {booking.personalization_name && (
                          <div>
                            <span className="text-anthracite-400">Name:</span>{" "}
                            {booking.personalization_name}
                          </div>
                        )}
                        {booking.personalization_date && (
                          <div>
                            <span className="text-anthracite-400">Datum:</span>{" "}
                            {formatDateGerman(booking.personalization_date)}
                          </div>
                        )}
                        {booking.extra_wishes && (
                          <div className="italic text-anthracite-500">
                            {booking.extra_wishes}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-anthracite-500">
                    {(() => {
                      const items = extrasByBooking.get(booking.id) ?? [];
                      if (items.length === 0) return "—";
                      const newTotal = items
                        .filter((i) => !i.addedByAdmin)
                        .reduce((sum, i) => sum + i.price, 0);
                      const vorabTotal = items
                        .filter((i) => i.addedByAdmin)
                        .reduce((sum, i) => sum + i.price, 0);
                      return (
                        <div className="space-y-0.5">
                          {items.map((item, i) => (
                            <div key={i}>
                              {item.label} · {formatCurrencyEUR(item.price)}
                              {item.addedByAdmin && (
                                <span className="text-anthracite-400"> (vorab)</span>
                              )}
                            </div>
                          ))}
                          <div className="font-medium text-anthracite-700">
                            Neu zu berechnen: {formatCurrencyEUR(newTotal)}
                          </div>
                          {vorabTotal > 0 && (
                            <div className="text-anthracite-400">
                              Bereits abgerechnet: {formatCurrencyEUR(vorabTotal)}
                            </div>
                          )}
                          {booking.extras_confirmed_at ? (
                            <Badge tone="success" className="mt-1">
                              Gebucht am {formatDateTimeGerman(booking.extras_confirmed_at)} Uhr
                            </Badge>
                          ) : (
                            <Badge tone="neutral" className="mt-1">
                              Noch nicht gebucht
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const byName = latestProofsByBooking.get(booking.id);
                      const latest = byName ? Array.from(byName.values()) : [];
                      const screenProofApproved =
                        latestScreenProofStatusByBooking.get(booking.id) === "freigegeben";
                      const steps = [
                        {
                          label: "Startbildschirm",
                          done:
                            Boolean(booking.selected_home_screen_id) ||
                            (personalizedScreenBookingIds.has(booking.id) && screenProofApproved),
                        },
                        { label: "Layout", done: Boolean(booking.selected_layout_id) },
                        {
                          label: "Freigabe",
                          done: latest.length > 0 && latest.every((p) => p.status === "freigegeben"),
                        },
                        { label: "Event Highlights", done: Boolean(booking.extras_confirmed_at) },
                      ];
                      const doneCount = steps.filter((s) => s.done).length;
                      return (
                        <div className="space-y-1">
                          <Badge tone={doneCount === steps.length ? "success" : "neutral"}>
                            {doneCount}/{steps.length} Schritte
                          </Badge>
                          <div className="flex flex-col gap-0.5 text-[11px] text-anthracite-400">
                            {steps.map((step) => (
                              <span key={step.label}>
                                {step.done ? "✓" : "○"} {step.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <OnlineGalleryCell
                      bookingId={booking.id}
                      url={booking.online_gallery_url}
                      clickedAt={booking.online_gallery_clicked_at}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {booking.google_review_clicked_at ? (
                      <div className="space-y-0.5">
                        <Badge tone="success">Geklickt</Badge>
                        <p className="text-anthracite-400">
                          am {formatDateTimeGerman(booking.google_review_clicked_at)} Uhr
                        </p>
                      </div>
                    ) : (
                      <Badge tone="neutral">Noch nicht geklickt</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="space-y-0.5 text-anthracite-600">
                      <div>
                        <span className="text-anthracite-400">Lief.:</span>{" "}
                        {booking.delivery_date ? (
                          <>
                            {formatDateGerman(booking.delivery_date)}
                            {booking.delivery_time && `, ${formatTimeGerman(booking.delivery_time)}`}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div>
                        <span className="text-anthracite-400">Abh.:</span>{" "}
                        {booking.pickup_date ? (
                          <>
                            {formatDateGerman(booking.pickup_date)}
                            {booking.pickup_time && `, ${formatTimeGerman(booking.pickup_time)}`}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                      <Link
                        href={`/admin/lieferung?booking=${booking.id}`}
                        className="font-medium text-gold-700 hover:underline"
                      >
                        Bearbeiten
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <BookingRowActions bookingId={booking.id} />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-anthracite-400">
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

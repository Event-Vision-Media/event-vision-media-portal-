import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingRowActions } from "@/components/admin/BookingRowActions";
import { CustomLoginCodeCell } from "@/components/admin/CustomLoginCodeCell";
import { PremiumIncludedToggle } from "@/components/admin/PremiumIncludedToggle";
import { SelectedLayoutSummary } from "@/components/admin/SelectedLayoutSummary";
import { SelectedHomeScreenSummary } from "@/components/admin/SelectedHomeScreenSummary";
import { LayoutProofGroup } from "@/components/admin/LayoutProofGroup";
import { NewLayoutProofForm } from "@/components/admin/NewLayoutProofForm";
import { PersonalizationDetailsCard } from "@/components/admin/PersonalizationDetailsCard";
import { PersonalizedScreenProofPanel } from "@/components/admin/PersonalizedScreenProofPanel";
import { NewPersonalizedScreenProofForm } from "@/components/admin/NewPersonalizedScreenProofForm";
import { DeliveryPickupForm } from "@/components/admin/DeliveryPickupForm";
import { OnlineGalleryCell } from "@/components/admin/OnlineGalleryCell";
import { AdminNotesEditor } from "@/components/admin/AdminNotesEditor";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR, formatDateGerman, formatDateTimeGerman } from "@/lib/format";
import type {
  Booking,
  BookingStatus,
  LayoutProof,
  PersonalizedScreenProof,
  PersonalizedScreenRequest,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BookingStatus, string> = {
  offen: "Offen",
  layout_ausgewaehlt: "Layout ausgewählt",
  personalisierung_komplett: "Komplett",
};

export default async function AdminBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createAdminClient();

  const [
    { data: bookingData },
    { data: bookingExtrasData },
    { data: layoutProofsData },
    { data: requestData },
    { data: screenProofsData },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, layouts(name, preview_image_url, extra_price), home_screens(name, preview_image_url)")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("booking_extras")
      .select("price, added_by_admin, extras(name, category), extra_variants(name)")
      .eq("booking_id", params.id),
    supabase
      .from("layout_proofs")
      .select("*")
      .eq("booking_id", params.id)
      .order("version", { ascending: false }),
    supabase
      .from("personalized_screen_requests")
      .select("*")
      .eq("booking_id", params.id)
      .maybeSingle(),
    supabase
      .from("personalized_screen_proofs")
      .select("*")
      .eq("booking_id", params.id)
      .order("version", { ascending: false }),
  ]);

  const booking = bookingData as (Booking & { layouts: any; home_screens: any }) | null;

  if (!booking) {
    return (
      <div className="min-h-screen bg-sand-50">
        <AdminHeader />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
            ← Zurück zur Übersicht
          </Link>
          <p className="mt-6 text-sm text-anthracite-400">Buchung nicht gefunden.</p>
        </main>
      </div>
    );
  }

  const extraItems = (bookingExtrasData ?? []).map((be: any) => ({
    label: be.extra_variants?.name ? `${be.extras?.name} – ${be.extra_variants.name}` : be.extras?.name ?? "Extra",
    price: be.price,
    addedByAdmin: be.added_by_admin,
    isPersonalizedScreen: be.extras?.category === "Startbildschirm",
  }));
  const isPersonalizedBooked = extraItems.some((e) => e.isPersonalizedScreen);
  const newExtrasTotal = extraItems
    .filter((e) => !e.addedByAdmin)
    .reduce((sum, e) => sum + e.price, 0);
  const vorabExtrasTotal = extraItems
    .filter((e) => e.addedByAdmin)
    .reduce((sum, e) => sum + e.price, 0);

  const proofs = (layoutProofsData ?? []) as LayoutProof[];
  const groupedByName = new Map<string, LayoutProof[]>();
  proofs.forEach((proof) => {
    const list = groupedByName.get(proof.layout_name) ?? [];
    list.push(proof);
    groupedByName.set(proof.layout_name, list);
  });
  const layoutNames = Array.from(groupedByName.keys());
  const latestLayoutProofs = layoutNames.map((name) => groupedByName.get(name)![0]);
  const layoutApprovalDone =
    latestLayoutProofs.length > 0 && latestLayoutProofs.every((p) => p.status === "freigegeben");
  const layoutApprovedCount = latestLayoutProofs.filter((p) => p.status === "freigegeben").length;

  const request = (requestData as PersonalizedScreenRequest | null) ?? null;
  const screenProofs = (screenProofsData ?? []) as PersonalizedScreenProof[];
  const latestScreenProof = screenProofs[0] ?? null;
  const screenProofApproved = latestScreenProof?.status === "freigegeben";

  const homeScreenDone =
    Boolean(booking.selected_home_screen_id) || (isPersonalizedBooked && screenProofApproved);
  const layoutDone = Boolean(booking.selected_layout_id);
  const extrasDone = Boolean(booking.extras_confirmed_at);

  const steps = [
    { label: "Startbildschirm", done: homeScreenDone },
    { label: "Layout ausgewählt", done: layoutDone },
    { label: "Layout-Freigabe", done: layoutApprovalDone },
    { label: "Event Highlights", done: extrasDone },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
            ← Zurück zur Übersicht
          </Link>
          <BookingRowActions bookingId={booking.id} />
        </div>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-anthracite-400">
                {booking.booking_code}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-anthracite-800">
                {booking.couple_names}
              </h1>
              <p className="mt-1 text-sm text-anthracite-500">
                {formatDateGerman(booking.event_date)} · {booking.product_type}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={booking.status === "personalisierung_komplett" ? "success" : "neutral"}>
                {STATUS_LABELS[booking.status as BookingStatus]}
              </Badge>
              <Badge tone={doneCount === steps.length ? "success" : "neutral"}>
                {doneCount}/{steps.length} Schritte
              </Badge>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1.5 border-t border-anthracite-100 pt-4 text-sm text-anthracite-600">
            {steps.map((step) => (
              <span key={step.label}>
                {step.done ? "✓" : "○"} {step.label}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-anthracite-100 pt-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-anthracite-400">
                Login-Passwort
              </p>
              <CustomLoginCodeCell bookingId={booking.id} code={booking.custom_login_code} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-anthracite-400">
                Premium-Layout
              </p>
              <PremiumIncludedToggle
                bookingId={booking.id}
                included={booking.premium_layout_included}
              />
            </div>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">Layout</h2>
          <div className="space-y-4">
            <SelectedLayoutSummary
              layout={booking.layouts}
              isPremiumSelected={booking.is_premium_selected}
              premiumIncluded={booking.premium_layout_included}
              personalizationName={booking.personalization_name}
              personalizationDate={booking.personalization_date}
              extraWishes={booking.extra_wishes}
            />
            {layoutNames.length > 0 && (
              <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-anthracite-800">Layout-Freigabe</h3>
                  <Badge tone={layoutApprovalDone ? "success" : "neutral"}>
                    {layoutApprovedCount}/{latestLayoutProofs.length} freigegeben
                  </Badge>
                </div>
                <div className="space-y-4">
                  {layoutNames.map((name) => (
                    <LayoutProofGroup key={name} layoutName={name} versions={groupedByName.get(name)!} />
                  ))}
                </div>
              </div>
            )}
            <Card>
              <h3 className="mb-3 font-medium text-anthracite-800">Neuen Layout-Entwurf hochladen</h3>
              <NewLayoutProofForm bookingId={booking.id} existingLayoutNames={layoutNames} />
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">Startbildschirm</h2>
          <div className="space-y-4">
            <SelectedHomeScreenSummary
              homeScreen={booking.home_screens}
              productType={booking.product_type}
              isPersonalizedBooked={isPersonalizedBooked}
            />
            {isPersonalizedBooked && (
              <>
                <PersonalizationDetailsCard request={request} />
                <PersonalizedScreenProofPanel versions={screenProofs} />
                <Card>
                  <h3 className="mb-3 font-medium text-anthracite-800">
                    Neuen Startbildschirm-Entwurf hochladen
                  </h3>
                  <NewPersonalizedScreenProofForm bookingId={booking.id} />
                </Card>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">
            Zusatzbuchungen
          </h2>
          <Card>
            {extraItems.length === 0 ? (
              <p className="text-sm text-anthracite-400">Keine Zusatzbuchungen.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {extraItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-anthracite-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-anthracite-700">
                      {item.label}
                      {item.addedByAdmin && (
                        <span className="ml-1.5 text-xs text-anthracite-400">(vorab)</span>
                      )}
                    </span>
                    <span className="font-medium text-anthracite-800">
                      {formatCurrencyEUR(item.price)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-anthracite-100 pt-2 font-medium text-anthracite-800">
                  <span>Neu zu berechnen</span>
                  <span>{formatCurrencyEUR(newExtrasTotal)}</span>
                </div>
                {vorabExtrasTotal > 0 && (
                  <div className="flex items-center justify-between text-anthracite-400">
                    <span>Bereits abgerechnet</span>
                    <span>{formatCurrencyEUR(vorabExtrasTotal)}</span>
                  </div>
                )}
                <div className="pt-1">
                  {booking.extras_confirmed_at ? (
                    <Badge tone="success">
                      Gebucht am {formatDateTimeGerman(booking.extras_confirmed_at)} Uhr
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Noch nicht gebucht</Badge>
                  )}
                </div>
              </div>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">
            Lieferung &amp; Abholung
          </h2>
          <Card>
            <DeliveryPickupForm booking={booking} />
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">
            Online-Galerie &amp; Bewertung
          </h2>
          <Card className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-anthracite-400">
                Online-Galerie
              </p>
              <OnlineGalleryCell
                bookingId={booking.id}
                url={booking.online_gallery_url}
                clickedAt={booking.online_gallery_clicked_at}
              />
            </div>
            <div className="border-t border-anthracite-100 pt-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-anthracite-400">
                Google-Bewertung
              </p>
              {booking.google_review_clicked_at ? (
                <div className="space-y-0.5 text-xs">
                  <Badge tone="success">Geklickt</Badge>
                  <p className="text-anthracite-400">
                    am {formatDateTimeGerman(booking.google_review_clicked_at)} Uhr
                  </p>
                </div>
              ) : (
                <Badge tone="neutral">Noch nicht geklickt</Badge>
              )}
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">
            Interne Notizen
          </h2>
          <Card>
            <AdminNotesEditor bookingId={booking.id} notes={booking.addon_notes} />
          </Card>
        </section>
      </main>
    </div>
  );
}

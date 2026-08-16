import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BookingRowActions } from "@/components/admin/BookingRowActions";
import { CustomLoginCodeCell } from "@/components/admin/CustomLoginCodeCell";
import { PremiumIncludedToggle } from "@/components/admin/PremiumIncludedToggle";
import { EventUploadedToggle } from "@/components/admin/EventUploadedToggle";
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
import { AudioGuestbookAdminSection } from "@/components/admin/AudioGuestbookAdminSection";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR, formatDateGerman, formatDateTimeGerman } from "@/lib/format";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import {
  SELECTION_SWITCH_FEE,
  type AudioGuestbookGreeting,
  type AudioGuestbookRecording,
  type Booking,
  type BookingStatus,
  type LayoutProof,
  type PersonalizedScreenProof,
  type PersonalizedScreenRequest,
} from "@/lib/types";

const AUDIO_GREETINGS_BUCKET = "audio-guestbook-greetings";
const AUDIO_RECORDINGS_BUCKET = "audio-guestbook-recordings";
const AUDIO_PLAY_URL_TTL_SECONDS = 3600;

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
    { data: audioGreetingData },
    { data: audioRecordingsData },
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
    supabase.from("audio_guestbook_greetings").select("*").eq("booking_id", params.id).maybeSingle(),
    supabase
      .from("audio_guestbook_recordings")
      .select("*")
      .eq("booking_id", params.id)
      .order("uploaded_at", { ascending: true }),
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

  const premiumFee =
    booking.is_premium_selected && !booking.premium_layout_included
      ? booking.layouts?.extra_price ?? 0
      : 0;
  const layoutSwitchFee = booking.layout_switch_count * SELECTION_SWITCH_FEE;
  const homeScreenSwitchFee = booking.home_screen_switch_count * SELECTION_SWITCH_FEE;
  const totalToInvoice = premiumFee + layoutSwitchFee + homeScreenSwitchFee + newExtrasTotal;

  const hasAudioGuestbook = bookingHasAudioGuestbook(
    booking.product_type,
    extraItems.map((e) => e.label)
  );

  const audioGreeting = audioGreetingData as AudioGuestbookGreeting | null;
  const audioRecordings = (audioRecordingsData ?? []) as AudioGuestbookRecording[];

  let audioGreetingPlayUrl: string | null = null;
  const audioRecordingPlayUrlByPath = new Map<string, string>();

  if (hasAudioGuestbook) {
    if (audioGreeting) {
      const { data } = await supabase.storage
        .from(AUDIO_GREETINGS_BUCKET)
        .createSignedUrl(audioGreeting.storage_path, AUDIO_PLAY_URL_TTL_SECONDS);
      audioGreetingPlayUrl = data?.signedUrl ?? null;
    }
    if (audioRecordings.length > 0) {
      const { data } = await supabase.storage
        .from(AUDIO_RECORDINGS_BUCKET)
        .createSignedUrls(
          audioRecordings.map((r) => r.storage_path),
          AUDIO_PLAY_URL_TTL_SECONDS
        );
      (data ?? []).forEach((entry) => {
        if (entry.signedUrl && !entry.error) {
          audioRecordingPlayUrlByPath.set(entry.path ?? "", entry.signedUrl);
        }
      });
    }
  }

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
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-anthracite-400">
                Veranstaltung im System angelegt
              </p>
              <EventUploadedToggle bookingId={booking.id} uploaded={booking.event_uploaded} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">Abrechnung</h2>
            <span className="flex-none font-serif text-xl font-semibold text-gold-700">
              {formatCurrencyEUR(totalToInvoice)}
            </span>
          </div>
          {totalToInvoice === 0 && vorabExtrasTotal === 0 ? (
            <p className="text-sm text-anthracite-400">Aktuell nichts zusätzlich zu berechnen.</p>
          ) : (
            <div className="space-y-1.5 text-sm text-anthracite-600">
              {premiumFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Premium-Layout Aufpreis</span>
                  <span className="font-medium text-anthracite-800">
                    {formatCurrencyEUR(premiumFee)}
                  </span>
                </div>
              )}
              {layoutSwitchFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Layout-Wechsel ({booking.layout_switch_count}×)</span>
                  <span className="font-medium text-anthracite-800">
                    {formatCurrencyEUR(layoutSwitchFee)}
                  </span>
                </div>
              )}
              {homeScreenSwitchFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Startbildschirm-Wechsel ({booking.home_screen_switch_count}×)</span>
                  <span className="font-medium text-anthracite-800">
                    {formatCurrencyEUR(homeScreenSwitchFee)}
                  </span>
                </div>
              )}
              {newExtrasTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span>Exclusive Extras</span>
                  <span className="font-medium text-anthracite-800">
                    {formatCurrencyEUR(newExtrasTotal)}
                  </span>
                </div>
              )}
            </div>
          )}
          {vorabExtrasTotal > 0 && (
            <p className="mt-3 border-t border-anthracite-100 pt-3 text-xs text-anthracite-400">
              Bereits abgerechnet (vorab, nicht in der Summe enthalten):{" "}
              {formatCurrencyEUR(vorabExtrasTotal)}
            </p>
          )}
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">Layout</h2>
            {booking.layout_switch_count > 0 && (
              <Badge tone="gold">
                {booking.layout_switch_count}× gewechselt ·{" "}
                {formatCurrencyEUR(booking.layout_switch_count * SELECTION_SWITCH_FEE)} Aufpreis
              </Badge>
            )}
          </div>
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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">Startbildschirm</h2>
            {booking.home_screen_switch_count > 0 && (
              <Badge tone="gold">
                {booking.home_screen_switch_count}× gewechselt ·{" "}
                {formatCurrencyEUR(booking.home_screen_switch_count * SELECTION_SWITCH_FEE)} Aufpreis
              </Badge>
            )}
          </div>
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

        {hasAudioGuestbook && (
          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold text-anthracite-800">
              Audiogästebuch
            </h2>
            <AudioGuestbookAdminSection
              bookingId={booking.id}
              eventDate={booking.event_date}
              greeting={
                audioGreeting
                  ? {
                      fileName: audioGreeting.file_name,
                      fileSize: audioGreeting.file_size,
                      uploadedAt: audioGreeting.uploaded_at,
                      playUrl: audioGreetingPlayUrl,
                    }
                  : null
              }
              recordings={audioRecordings.map((r) => ({
                id: r.id,
                fileName: r.file_name,
                fileSize: r.file_size,
                uploadedAt: r.uploaded_at,
                playUrl: audioRecordingPlayUrlByPath.get(r.storage_path) ?? null,
              }))}
            />
          </section>
        )}

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

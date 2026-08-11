import Link from "next/link";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateGerman } from "@/lib/format";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { Countdown } from "@/components/Countdown";
import { OnlineGallerySection } from "@/components/OnlineGallerySection";
import { GoogleReviewSection } from "@/components/GoogleReviewSection";
import { DeliveryPickupSection } from "@/components/DeliveryPickupSection";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LayoutProof } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const booking = await requireBooking();
  const supabase = createAdminClient();

  const { data: googleReviewSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_review_url")
    .maybeSingle();
  const googleReviewUrl = googleReviewSetting?.value ?? null;

  let selectedLayoutName: string | null = null;
  if (booking.selected_layout_id) {
    const { data } = await supabase
      .from("layouts")
      .select("name")
      .eq("id", booking.selected_layout_id)
      .maybeSingle();
    selectedLayoutName = data?.name ?? null;
  }

  let selectedHomeScreenName: string | null = null;
  if (booking.selected_home_screen_id) {
    const { data } = await supabase
      .from("home_screens")
      .select("name")
      .eq("id", booking.selected_home_screen_id)
      .maybeSingle();
    selectedHomeScreenName = data?.name ?? null;
  }

  const { data: personalizedExtras } = await supabase
    .from("extras")
    .select("id")
    .eq("category", "Startbildschirm")
    .limit(1);
  const personalizedExtraId = (personalizedExtras ?? [])[0]?.id as string | undefined;

  let isPersonalizedBooked = false;
  if (personalizedExtraId) {
    const { count } = await supabase
      .from("booking_extras")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id)
      .eq("extra_id", personalizedExtraId);
    isPersonalizedBooked = Boolean(count);
  }

  const { data: latestScreenProofData } = await supabase
    .from("personalized_screen_proofs")
    .select("id, status")
    .eq("booking_id", booking.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const screenProofAwaitingReview = latestScreenProofData?.status === "in_pruefung";

  const { data: proofsData } = await supabase
    .from("layout_proofs")
    .select("*")
    .eq("booking_id", booking.id)
    .order("version", { ascending: false });

  const proofs = (proofsData ?? []) as LayoutProof[];
  const latestByName = new Map<string, LayoutProof>();
  proofs.forEach((proof) => {
    if (!latestByName.has(proof.layout_name)) {
      latestByName.set(proof.layout_name, proof);
    }
  });
  const latestProofs = Array.from(latestByName.values());
  const approvalDone =
    latestProofs.length > 0 && latestProofs.every((p) => p.status === "freigegeben");
  const changesRequestedCount = latestProofs.filter(
    (p) => p.status === "aenderungen_erforderlich"
  ).length;
  const approvedCount = latestProofs.filter((p) => p.status === "freigegeben").length;

  const layoutDone = Boolean(booking.selected_layout_id);
  const extrasDone = Boolean(booking.extras_confirmed_at);
  const homeScreenDone = Boolean(booking.selected_home_screen_id);

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {screenProofAwaitingReview && (
          <Link
            href="/dashboard/startbildschirm"
            className="animate-fade-in-up flex flex-col items-start gap-3 rounded-2xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
                <MonitorIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-anthracite-800">
                  Euer Startbildschirm-Entwurf ist da!
                </p>
                <p className="mt-0.5 text-sm text-anthracite-600">
                  Bitte prüft ihn und gebt ihn frei oder fordert Änderungen an.
                </p>
              </div>
            </div>
            <Button className="w-full flex-none sm:w-auto">Jetzt prüfen</Button>
          </Link>
        )}

        <div className="animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">
            Willkommen
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-anthracite-800 sm:text-3xl">
            Hallo {booking.couple_names}!
          </h1>
          <p className="mt-2 text-anthracite-500">
            Schön, dass ihr da seid. Hier verwaltet ihr eure Auswahl für euer
            Event mit Event Vision Media.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-anthracite-100 bg-white px-3 py-1.5 text-xs font-medium text-anthracite-600 shadow-sm">
              <CalendarIcon />
              {formatDateGerman(booking.event_date)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-anthracite-100 bg-white px-3 py-1.5 text-xs font-medium text-anthracite-600 shadow-sm">
              <CameraIcon />
              {booking.product_type}
            </span>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <Countdown eventDate={booking.event_date} />
        </div>

        <Card className="animate-fade-in-up" style={{ animationDelay: "140ms" }}>
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">
            Euer Fortschritt
          </h2>
          <div className="mt-5 flex items-start gap-0">
            <StepItem
              done={homeScreenDone}
              index={1}
              label="Startbildschirm"
              detail={selectedHomeScreenName ?? undefined}
              isLast={false}
            />
            <StepItem
              done={layoutDone}
              index={2}
              label="Layout ausgewählt"
              detail={selectedLayoutName ?? undefined}
              isLast={false}
            />
            <StepItem
              done={approvalDone}
              index={3}
              label="Layout abgestimmt"
              isLast={false}
            />
            <StepItem
              done={extrasDone}
              index={4}
              label="Event Highlights"
              isLast
            />
          </div>
        </Card>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 text-white shadow-sm">
                  <MonitorIcon className="h-5 w-5" />
                </span>
                <div className="flex gap-1.5">
                  {isPersonalizedBooked && <Badge tone="gold">Personalisiert</Badge>}
                  {homeScreenDone && <Badge tone="success">Erledigt</Badge>}
                </div>
              </div>
              <h3 className="font-medium text-anthracite-800">Startbildschirm</h3>
              <p className="mt-1 text-sm text-anthracite-500">
                {homeScreenDone
                  ? `Ihr habt "${selectedHomeScreenName}" gewählt.`
                  : "Wählt euren Startbildschirm passend zu eurem Produkt."}
              </p>
            </div>
            <Link href="/dashboard/startbildschirm" className="mt-4">
              <Button className="w-full" variant={homeScreenDone ? "ghost" : "primary"}>
                {homeScreenDone ? "Auswahl bearbeiten" : "Jetzt Startbildschirm wählen"}
              </Button>
            </Link>
          </Card>

          <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-anthracite-800 to-anthracite-700 text-white shadow-sm">
                  <CameraIcon className="h-5 w-5" />
                </span>
                <div className="flex gap-1.5">
                  {booking.is_premium_selected && <Badge tone="gold">Premium</Badge>}
                  {layoutDone && <Badge tone="success">Erledigt</Badge>}
                </div>
              </div>
              <h3 className="font-medium text-anthracite-800">Foto-Layout</h3>
              <p className="mt-1 text-sm text-anthracite-500">
                {layoutDone
                  ? `Ihr habt "${selectedLayoutName}" gewählt.`
                  : "Wählt aus 17 liebevoll gestalteten Layouts euer Favorit."}
              </p>
            </div>
            <Link href="/dashboard/layout" className="mt-4">
              <Button className="w-full" variant={layoutDone ? "ghost" : "primary"}>
                {layoutDone ? "Auswahl bearbeiten" : "Jetzt Layout auswählen"}
              </Button>
            </Link>
          </Card>

          <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-anthracite-700 to-anthracite-600 text-white shadow-sm">
                  <ClipboardCheckIcon className="h-5 w-5" />
                </span>
                {approvalDone && <Badge tone="success">Erledigt</Badge>}
                {!approvalDone && changesRequestedCount > 0 && (
                  <Badge tone="gold">Änderung angefordert</Badge>
                )}
              </div>
              <h3 className="font-medium text-anthracite-800">Layout-Freigabe</h3>
              <p className="mt-1 text-sm text-anthracite-500">
                {latestProofs.length === 0
                  ? "Sobald euer Team ein Layout hochgeladen hat, könnt ihr es hier prüfen."
                  : `${approvedCount} von ${latestProofs.length} Layout(s) freigegeben.`}
              </p>
            </div>
            <Link href="/dashboard/layout-freigabe" className="mt-4">
              <Button className="w-full" variant={approvalDone ? "ghost" : "primary"}>
                {approvalDone ? "Layouts ansehen" : "Layouts prüfen"}
              </Button>
            </Link>
          </Card>

          <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
                  <SparkleIcon className="h-5 w-5" />
                </span>
                {extrasDone && <Badge tone="success">Erledigt</Badge>}
              </div>
              <h3 className="font-medium text-anthracite-800">Event Highlights</h3>
              <p className="mt-1 text-sm text-anthracite-500">
                Wählt besondere Exclusive Extras für unvergessliche Erinnerungen
                und das gewisse Etwas.
              </p>
            </div>
            <Link href="/dashboard/event-highlights" className="mt-4">
              <Button
                className="w-full"
                variant={extrasDone ? "ghost" : "primary"}
              >
                {extrasDone
                  ? "Angaben bearbeiten"
                  : "Event Highlights ausfüllen"}
              </Button>
            </Link>
          </Card>
        </div>

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
          <DeliveryPickupSection booking={booking} />
        </div>

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "260ms" }}>
          <OnlineGallerySection
            eventDate={booking.event_date}
            galleryUrl={booking.online_gallery_url}
            clickedAt={booking.online_gallery_clicked_at}
          />
        </div>

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <GoogleReviewSection reviewUrl={googleReviewUrl} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StepItem({
  done,
  index,
  label,
  detail,
  isLast,
}: {
  done: boolean;
  index: number;
  label: string;
  detail?: string;
  isLast: boolean;
}) {
  return (
    <div className={`flex flex-1 items-center ${isLast ? "" : ""}`}>
      <div className="flex flex-col items-center">
        <span
          className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold transition-colors ${
            done
              ? "bg-emerald-500 text-white shadow-sm"
              : "border-2 border-anthracite-200 bg-white text-anthracite-400"
          }`}
        >
          {done ? "✓" : index}
        </span>
        <div className="mt-2 max-w-[110px] text-center">
          <p
            className={`text-xs font-medium ${done ? "text-anthracite-800" : "text-anthracite-400"}`}
          >
            {label}
          </p>
          {detail && <p className="mt-0.5 text-[11px] text-anthracite-400">{detail}</p>}
        </div>
      </div>
      {!isLast && (
        <div
          className={`mx-2 mb-6 h-0.5 flex-1 rounded-full transition-colors ${
            done ? "bg-emerald-400" : "bg-anthracite-100"
          }`}
        />
      )}
    </div>
  );
}

function MonitorIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4.5" width="16" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5.5" y="5" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 4.5h6a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 13l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3.5M16 3.5v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7H7l1.2-1.6A1.5 1.5 0 0 1 9.4 4.8h5.2c.47 0 .91.22 1.2.6L17 7h1.5A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SparkleIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4.5c.4 2.6 1.1 4.4 2.1 5.4s2.8 1.7 5.4 2.1c-2.6.4-4.4 1.1-5.4 2.1s-1.7 2.8-2.1 5.4c-.4-2.6-1.1-4.4-2.1-5.4S7.1 12.4 4.5 12c2.6-.4 4.4-1.1 5.4-2.1S11.6 7.1 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

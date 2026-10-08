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
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { getAudioGreetingDeadline } from "@/lib/types";
import { EXTRAS as CATALOG_EXTRAS, bundledExtraNames, daysUntil, followupLine, staffFor, upgradeOffers } from "@/lib/catalog";
import { StaffTimeCard } from "@/components/StaffTimeCard";
import { UpgradeCard } from "@/components/UpgradeCard";
import { UpsellSection } from "@/components/UpsellSection";
import { getLatestContract } from "@/lib/contract-server";
import { contractRequired } from "@/lib/contract";
import { getPaymentSummary } from "@/lib/payments";
import { PaymentCard } from "@/components/PaymentCard";
import type { LayoutProof } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const booking = await requireBooking();
  const supabase = createAdminClient();
  // Firmen werden gesiezt, Privatkunden (meist Paare/Familien) mit "ihr" angesprochen
  const sie = booking.customer_type === "business";
  const t = (ihr: string, s: string) => (sie ? s : ihr);
  const { count: includedLayoutCount } = await supabase
    .from("layouts")
    .select("id", { count: "exact", head: true })
    .eq("is_premium", false);

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
  const screenProofApproved = latestScreenProofData?.status === "freigegeben";

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
  const layoutProofAwaitingReview = latestProofs.some((p) => p.status === "in_pruefung");

  const layoutDone = Boolean(booking.selected_layout_id);
  const extrasDone = Boolean(booking.extras_confirmed_at);
  const homeScreenDone =
    Boolean(booking.selected_home_screen_id) || (isPersonalizedBooked && screenProofApproved);

  const { data: bookedExtrasForAudio } = await supabase
    .from("booking_extras")
    .select("price, extras(name), extra_variants(name)")
    .eq("booking_id", booking.id);

  // Im Portal nachgebuchte Extras (nicht schon Teil der Website-Anfrage)
  const inquiryExtraNames = new Set([
    ...(booking.inquiry_items?.extras ?? [])
      .map((e) => CATALOG_EXTRAS.find((c) => c.id === e.id)?.dbExtraName)
      .filter(Boolean),
    ...bundledExtraNames(booking.inquiry_items),
  ]);
  const laterExtras = (bookedExtrasForAudio ?? [])
    .filter((be: any) => be.extras?.name && !inquiryExtraNames.has(be.extras.name))
    .map((be: any) => ({
      name: be.extra_variants?.name ? `${be.extras.name}: ${be.extra_variants.name}` : be.extras.name,
      price: Number(be.price) || 0,
    }));
  const bookedExtraNames = (bookedExtrasForAudio ?? [])
    .map((be: any) => be.extras?.name)
    .filter(Boolean);
  const staff = staffFor(booking.inquiry_items);
  // Günstigstes Upgrade-Angebot (z. B. Audiogästebuch Basis → Komfort)
  const offer = daysUntil(booking.event_date) >= 2
    ? upgradeOffers((booking.inquiry_items?.packages ?? []).map((p) => p.id)).sort((a, b) => a.diff - b.diff)[0]
    : undefined;
  const upgrade = offer
    ? { fromId: offer.from.id, fromName: offer.from.name, toId: offer.to.id, toName: offer.to.name, diff: offer.diff, perks: offer.perks }
    : null;

  const hasAudioGuestbook = bookingHasAudioGuestbook(booking.product_type, bookedExtraNames, booking.inquiry_items);

  let audioGreetingMissing = false;
  if (hasAudioGuestbook) {
    const { count } = await supabase
      .from("audio_guestbook_greetings")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id);
    audioGreetingMissing = !count;
  }
  const audioGreetingDeadline = getAudioGreetingDeadline(booking.event_date);

  const contract = await getLatestContract(booking.id);
  const showContract = contractRequired(booking) || Boolean(contract);
  const payment = contractRequired(booking) ? await getPaymentSummary(booking) : null;
  const contractMissing = contractRequired(booking) && !contract && daysUntil(booking.event_date) >= 0;

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {contractMissing && (
          <Link
            href="/dashboard/vertrag"
            className="animate-fade-in-up flex flex-col items-start gap-3 rounded-2xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
                <PenIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-anthracite-800">
                  {booking.customer_type === "business" ? "Bitte unterschreiben Sie Ihren Mietvertrag" : "Bitte unterschreib deinen Mietvertrag"}
                </p>
                <p className="mt-0.5 text-sm text-anthracite-600">
                  {booking.customer_type === "business"
                    ? "Bereits vorausgefüllt – digital in ca. 2 Minuten erledigt."
                    : "Schon vorausgefüllt – digital in ca. 2 Minuten erledigt."}
                </p>
              </div>
            </div>
            <Button className="w-full flex-none sm:w-auto">Jetzt unterschreiben</Button>
          </Link>
        )}

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
                  {t("Euer Startbildschirm-Entwurf ist da!", "Ihr Startbildschirm-Entwurf ist da!")}
                </p>
                <p className="mt-0.5 text-sm text-anthracite-600">
                  {t("Bitte prüft ihn und gebt ihn frei oder fordert Änderungen an.", "Bitte prüfen Sie ihn und geben Sie ihn frei oder fordern Sie Änderungen an.")}
                </p>
              </div>
            </div>
            <Button className="w-full flex-none sm:w-auto">Jetzt prüfen</Button>
          </Link>
        )}

        {audioGreetingMissing && (
          <Link
            href="/dashboard/audiogaestebuch"
            className="animate-fade-in-up flex flex-col items-start gap-3 rounded-2xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
                <MicIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-anthracite-800">
                  {t("Eure Begrüßungsnachricht fehlt noch.", "Ihre Begrüßungsnachricht fehlt noch.")}
                </p>
                <p className="mt-0.5 text-sm text-anthracite-600">
                  {t("Bitte ladet sie spätestens bis zum", "Bitte laden Sie sie spätestens bis zum")}{" "}
                  {formatDateGerman(audioGreetingDeadline.toISOString().slice(0, 10))} hoch.
                </p>
              </div>
            </div>
            <Button className="w-full flex-none sm:w-auto">Jetzt hochladen</Button>
          </Link>
        )}

        {layoutProofAwaitingReview && (
          <Link
            href="/dashboard/layout-freigabe"
            className="animate-fade-in-up flex flex-col items-start gap-3 rounded-2xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-sm">
                <ClipboardCheckIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-anthracite-800">
                  {t("Euer Layout-Entwurf ist da!", "Ihr Layout-Entwurf ist da!")}
                </p>
                <p className="mt-0.5 text-sm text-anthracite-600">
                  {t("Bitte prüft ihn und gebt ihn frei oder fordert Änderungen an.", "Bitte prüfen Sie ihn und geben Sie ihn frei oder fordern Sie Änderungen an.")}
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
            {sie ? `Guten Tag, ${booking.customer_name || booking.couple_names}` : `Hallo ${booking.couple_names}!`}
          </h1>
          <p className="mt-2 text-anthracite-500">
            {t(
              "Schön, dass ihr da seid. Hier verwaltet ihr alles rund um euer Event mit Event Vision Media.",
              `Willkommen im Kundenportal. Hier behalten Sie alle Details ${booking.company ? `der Veranstaltung von ${booking.company}` : "Ihrer Veranstaltung"} im Blick.`
            )}
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

        {booking.lifecycle === "reserviert" && (
          <div className="animate-fade-in-up rounded-2xl border border-gold-300 bg-gold-50 p-5">
            {booking.customer_type === "business" ? (
              <>
                <p className="font-serif text-lg font-semibold text-anthracite-800">Ihr Termin ist reserviert</p>
                <p className="mt-1 text-sm text-anthracite-600">
                  Wir prüfen gerade noch Location und Details und senden Ihnen in Kürze Ihre
                  Auftragsbestätigung. Bitte unterschreiben Sie dafür Ihren Mietvertrag – Ihr Layout können Sie hier ebenfalls schon auswählen.
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-lg font-semibold text-anthracite-800">Euer Termin ist reserviert ✨</p>
                <p className="mt-1 text-sm text-anthracite-600">
                  Wir prüfen gerade noch Location und Details und schicken euch in Kürze eure
                  Auftragsbestätigung. Unterschreibt dafür bitte euren Mietvertrag – euer Layout könnt ihr hier auch schon auswählen.
                </p>
              </>
            )}
          </div>
        )}

        <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <Countdown eventDate={booking.event_date} sie={sie} />
        </div>

        {booking.inquiry_items?.packages?.length ? <BookedItemsCard booking={booking} laterExtras={laterExtras} /> : null}

        {payment && (
          <PaymentCard
            p={payment}
            sie={booking.customer_type === "business"}
            confirmed={booking.lifecycle === "bestaetigt"}
            bookingCode={booking.booking_code}
            hasContract={Boolean(contract)}
          />
        )}

        {upgrade && <UpgradeCard offer={upgrade} sie={booking.customer_type === "business"} />}

        <UpsellSection booking={booking} />

        <Card className="animate-fade-in-up" style={{ animationDelay: "140ms" }}>
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">
            {t("Euer Fortschritt", "Ihr Fortschritt")}
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
                {selectedHomeScreenName
                  ? t(`Ihr habt "${selectedHomeScreenName}" gewählt.`, `Sie haben "${selectedHomeScreenName}" gewählt.`)
                  : homeScreenDone
                    ? t("Euer personalisierter Startbildschirm wurde freigegeben.", "Ihr individueller Startbildschirm wurde freigegeben.")
                    : t("Wählt euren Startbildschirm passend zu eurem Produkt.", "Wählen Sie den Startbildschirm, den Ihre Gäste zuerst sehen.")}
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
                  ? t(`Ihr habt "${selectedLayoutName}" gewählt.`, `Sie haben "${selectedLayoutName}" gewählt.`)
                  : t(
                      `Wählt aus ${includedLayoutCount ?? 17} inklusiven Layouts euren Favoriten – oder gönnt euch ein Premium-Design.`,
                      `Wählen Sie aus ${includedLayoutCount ?? 17} inklusiven Layouts – oder aus unseren Premium-Designs.`
                    )}
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
                  ? t("Sobald unser Team euer Layout gestaltet hat, könnt ihr es hier prüfen.", "Sobald unser Team Ihr Layout gestaltet hat, können Sie es hier prüfen.")
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
                {t(
                  "Wählt besondere Exclusive Extras für unvergessliche Erinnerungen und das gewisse Etwas.",
                  "Ergänzen Sie Ihr Event um Extras wie Live-Galerie, Betreuung vor Ort oder Branding."
                )}
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

          {showContract && (
          <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-anthracite-800 to-anthracite-700 text-white shadow-sm">
                  <PenIcon className="h-5 w-5" />
                </span>
                {contract?.countersigned_at ? (
                  <Badge tone="success">Erledigt</Badge>
                ) : contract ? (
                  <Badge tone="gold">Unterschrieben</Badge>
                ) : null}
              </div>
              <h3 className="font-medium text-anthracite-800">Mietvertrag</h3>
              <p className="mt-1 text-sm text-anthracite-500">
                {contract?.countersigned_at
                  ? "Abgeschlossen – jederzeit hier abrufbar."
                  : contract
                    ? "Unterschrieben – wird von uns geprüft."
                    : t("Vorausgefüllt aus eurer Buchung – nur noch prüfen und digital unterschreiben.", "Vorausgefüllt aus Ihrer Buchung – nur noch prüfen und digital unterschreiben.")}
              </p>
            </div>
            <Link href="/dashboard/vertrag" className="mt-4">
              <Button className="w-full" variant={contract ? "ghost" : "primary"}>
                {contract ? "Vertrag ansehen" : "Jetzt unterschreiben"}
              </Button>
            </Link>
          </Card>
          )}

          {hasAudioGuestbook && (
            <Card className="group flex flex-col justify-between transition-shadow duration-300 hover:shadow-card-hover">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 text-white shadow-sm">
                    <MicIcon className="h-5 w-5" />
                  </span>
                  {!audioGreetingMissing && <Badge tone="success">Erledigt</Badge>}
                </div>
                <h3 className="font-medium text-anthracite-800">Audiogästebuch</h3>
                <p className="mt-1 text-sm text-anthracite-500">
                  {audioGreetingMissing
                    ? t("Ladet eure Begrüßungsnachricht für die Gäste hoch.", "Laden Sie Ihre Begrüßungsnachricht für die Gäste hoch.")
                    : t("Eure Begrüßungsnachricht ist hochgeladen.", "Ihre Begrüßungsnachricht ist hochgeladen.")}
                </p>
              </div>
              <Link href="/dashboard/audiogaestebuch" className="mt-4">
                <Button className="w-full" variant={audioGreetingMissing ? "primary" : "ghost"}>
                  {audioGreetingMissing ? "Jetzt hochladen" : "Audiogästebuch ansehen"}
                </Button>
              </Link>
            </Card>
          )}
        </div>

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
          <DeliveryPickupSection booking={booking} />
        </div>

        {staff && (
          <div className="mt-4">
            <StaffTimeCard
              staff={staff}
              sie={sie}
              locked={daysUntil(booking.event_date) < 2}
              extraHourPrice={CATALOG_EXTRAS.find((e) => e.id === "betreuung-stunde")?.price ?? 59}
            />
          </div>
        )}

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "260ms" }}>
          <OnlineGallerySection
            sie={sie}
            eventDate={booking.event_date}
            galleryUrl={booking.online_gallery_url}
            clickedAt={booking.online_gallery_clicked_at}
          />
        </div>

        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <GoogleReviewSection reviewUrl={googleReviewUrl} sie={sie} />
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

function PenIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14.5 5.5l4 4L9 19H5v-4l9.5-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 20h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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

function MicIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 11.5a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 17.5v3M9 20.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

function BookedItemsCard({
  booking,
  laterExtras,
}: {
  booking: import("@/lib/types").Booking;
  laterExtras: { name: string; price: number }[];
}) {
  const items = booking.inquiry_items!;
  const laterSum = laterExtras.reduce((sum, e) => sum + e.price, 0);
  const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "110ms" }}>
      <h2 className="font-serif text-lg font-semibold text-anthracite-800">
        {booking.customer_type === "business" ? "Ihre Buchung" : "Eure Buchung"}
      </h2>
      <div className="mt-4 space-y-2 text-sm">
        {(items.packages ?? []).map((p) => (
          <div key={p.id} className="flex justify-between gap-4">
            <span className="text-anthracite-700">{p.name}</span>
            <span className="font-medium text-anthracite-800">{euro(p.price)}</span>
          </div>
        ))}
        {followupLine(items) && (
          <div className="flex justify-between gap-4">
            <span className="text-anthracite-700">{followupLine(items)!.label}</span>
            <span className="font-medium text-anthracite-800">{euro(followupLine(items)!.amount)}</span>
          </div>
        )}
        {(items.extras ?? []).map((e) => (
          <div key={e.id} className="flex justify-between gap-4 text-anthracite-500">
            <span>+ {e.name}</span>
            <span>{e.from ? "ab " : ""}{euro(e.price)}</span>
          </div>
        ))}
        {laterExtras.map((e) => (
          <div key={e.name} className="flex justify-between gap-4 text-emerald-700">
            <span>+ {e.name} <span className="text-xs text-emerald-600/80">(nachgebucht)</span></span>
            <span>{euro(e.price)}</span>
          </div>
        ))}
        {booking.total_price != null && (
          <div className="mt-2 flex justify-between gap-4 border-t border-anthracite-100 pt-3 font-semibold text-anthracite-800">
            <span>Gesamt</span>
            <span>{items.isFromPrice ? "ab " : ""}{euro(Number(booking.total_price) + laterSum)}</span>
          </div>
        )}
        <p className="pt-1 text-xs text-anthracite-400">Endpreis gemäß § 19 UStG ohne Umsatzsteuer.</p>
      </div>
    </Card>
  );
}

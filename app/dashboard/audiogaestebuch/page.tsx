import Link from "next/link";
import { redirect } from "next/navigation";
import { requireBooking } from "@/lib/booking-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHasAudioGuestbook } from "@/lib/audio-guestbook";
import { GuestHeader } from "@/components/GuestHeader";
import { Footer } from "@/components/Footer";
import { AudioGreetingUploader } from "@/components/AudioGreetingUploader";
import { AudioRecordingsList } from "@/components/AudioRecordingsList";
import { GALLERY_UNLOCK_DAYS, type AudioGuestbookGreeting, type AudioGuestbookRecording } from "@/lib/types";

export const dynamic = "force-dynamic";

const GREETINGS_BUCKET = "audio-guestbook-greetings";
const RECORDINGS_BUCKET = "audio-guestbook-recordings";
const PLAY_URL_TTL_SECONDS = 3600;

function formatDateLocal(date: Date) {
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AudioGuestbookPage() {
  const booking = await requireBooking();
  const supabase = createAdminClient();

  const { data: bookedExtras } = await supabase
    .from("booking_extras")
    .select("extras(name)")
    .eq("booking_id", booking.id);
  const bookedExtraNames = (bookedExtras ?? []).map((be: any) => be.extras?.name).filter(Boolean);

  if (!bookingHasAudioGuestbook(booking.product_type, bookedExtraNames)) {
    redirect("/dashboard");
  }

  const [{ data: greetingData }, { data: recordingsData }] = await Promise.all([
    supabase
      .from("audio_guestbook_greetings")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("audio_guestbook_recordings")
      .select("*")
      .eq("booking_id", booking.id)
      .order("uploaded_at", { ascending: true }),
  ]);

  const greeting = greetingData as AudioGuestbookGreeting | null;
  const recordings = (recordingsData ?? []) as AudioGuestbookRecording[];

  let greetingPlayUrl: string | null = null;
  if (greeting) {
    const { data } = await supabase.storage
      .from(GREETINGS_BUCKET)
      .createSignedUrl(greeting.storage_path, PLAY_URL_TTL_SECONDS);
    greetingPlayUrl = data?.signedUrl ?? null;
  }

  const playUrlByPath = new Map<string, string>();
  if (recordings.length > 0) {
    const { data } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrls(
        recordings.map((r) => r.storage_path),
        PLAY_URL_TTL_SECONDS
      );
    (data ?? []).forEach((entry) => {
      if (entry.signedUrl && !entry.error) {
        playUrlByPath.set(entry.path ?? "", entry.signedUrl);
      }
    });
  }

  const recordingsUnlockDate = new Date(booking.event_date + "T00:00:00");
  recordingsUnlockDate.setDate(recordingsUnlockDate.getDate() + GALLERY_UNLOCK_DAYS);
  const recordingsUnlockReached = new Date() >= recordingsUnlockDate;

  return (
    <div className="min-h-screen">
      <GuestHeader bookingCode={booking.booking_code} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-anthracite-400 transition hover:text-anthracite-700"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3 animate-fade-in-up">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-anthracite-800 sm:text-3xl">
            Dein Audiogästebuch
          </h1>
          <p className="mt-1 mb-6 text-anthracite-500">
            Lade hier deine persönliche Begrüßungsnachricht für dein Audiogästebuch hoch.
            Diese Nachricht hören eure Gäste, bevor sie ihre eigene Nachricht aufnehmen.
          </p>
        </div>

        <section className="mb-10 space-y-4 animate-fade-in-up">
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">
            Deine Begrüßungsnachricht
          </h2>
          <AudioGreetingUploader
            eventDate={booking.event_date}
            existingGreeting={
              greeting
                ? {
                    fileName: greeting.file_name,
                    fileSize: greeting.file_size,
                    uploadedAt: greeting.uploaded_at,
                  }
                : null
            }
            playUrl={greetingPlayUrl}
            downloadHref={`/api/audio-guestbook/file?kind=greeting&bookingId=${booking.id}`}
          />
        </section>

        <section className="space-y-4 animate-fade-in-up">
          <div>
            <h2 className="font-serif text-lg font-semibold text-anthracite-800">
              Eure Nachrichten
            </h2>
            <p className="mt-1 text-sm text-anthracite-500">
              Hier könnt ihr die persönlichen Nachrichten eurer Gäste anhören und
              herunterladen.
            </p>
          </div>

          {recordings.length > 0 ? (
            <AudioRecordingsList
              bookingId={booking.id}
              recordings={recordings.map((r) => ({
                id: r.id,
                fileName: r.file_name,
                fileSize: r.file_size,
                playUrl: playUrlByPath.get(r.storage_path) ?? null,
              }))}
            />
          ) : (
            <div className="rounded-2xl border border-anthracite-100 bg-anthracite-50 px-4 py-4 text-sm text-anthracite-600">
              {recordingsUnlockReached ? (
                <p>
                  Eure Aufnahmen werden gerade vorbereitet und sind in Kürze hier verfügbar. Wir
                  melden uns, sobald es so weit ist.
                </p>
              ) : (
                <p>
                  Eure Nachrichten sind ab dem{" "}
                  <span className="font-medium text-anthracite-800">
                    {formatDateLocal(recordingsUnlockDate)}
                  </span>{" "}
                  hier verfügbar — wir brauchen nach eurem Event noch etwas Zeit, um alle
                  Aufnahmen aufzubereiten.
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

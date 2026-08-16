import { Badge } from "@/components/ui/Badge";
import { formatDateGerman, formatDateTimeGerman, formatFileSize } from "@/lib/format";
import { getAudioGreetingDeadline } from "@/lib/types";
import { AudioRecordingsBulkUploader } from "@/components/admin/AudioRecordingsBulkUploader";
import { DeleteRecordingButton } from "@/components/admin/DeleteRecordingButton";

interface GreetingInfo {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  playUrl: string | null;
}

interface RecordingInfo {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  playUrl: string | null;
}

export function AudioGuestbookAdminSection({
  bookingId,
  eventDate,
  greeting,
  recordings,
}: {
  bookingId: string;
  eventDate: string;
  greeting: GreetingInfo | null;
  recordings: RecordingInfo[];
}) {
  const deadline = getAudioGreetingDeadline(eventDate);
  const isOverdue = !greeting && new Date() > deadline;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {greeting ? (
          <Badge tone="success">🟢 Begrüßung hochgeladen</Badge>
        ) : isOverdue ? (
          <Badge tone="danger">🔴 Begrüßung: Frist überschritten</Badge>
        ) : (
          <Badge tone="neutral">🟡 Begrüßung ausstehend</Badge>
        )}
        {recordings.length > 0 ? (
          <Badge tone="success">🟢 {recordings.length} Aufnahme(n) für Kunden verfügbar</Badge>
        ) : (
          <Badge tone="neutral">⚪ Noch keine Aufnahmen hochgeladen</Badge>
        )}
      </div>

      <div className="rounded-2xl border border-anthracite-100 bg-white p-4">
        <h3 className="mb-2 font-medium text-anthracite-800">Begrüßungsnachricht</h3>
        {greeting ? (
          <div className="space-y-2 text-sm text-anthracite-600">
            <p>Datei: {greeting.fileName}</p>
            <p>Hochgeladen am {formatDateTimeGerman(greeting.uploadedAt)} Uhr</p>
            <p>Größe: {formatFileSize(greeting.fileSize)}</p>
            {greeting.playUrl && (
              <audio controls src={greeting.playUrl} className="w-full">
                Dein Browser unterstützt keine Audio-Wiedergabe.
              </audio>
            )}
            <a
              href={`/api/audio-guestbook/file?kind=greeting&bookingId=${bookingId}`}
              className="inline-block text-sm font-medium text-gold-700 hover:underline"
            >
              Begrüßungsnachricht herunterladen
            </a>
          </div>
        ) : (
          <p className="text-sm text-anthracite-400">
            Noch nicht hochgeladen. Frist für den Kunden: {formatDateGerman(deadline.toISOString().slice(0, 10))}.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-anthracite-100 bg-white p-4">
        <h3 className="mb-3 font-medium text-anthracite-800">Gästeaufnahmen</h3>
        <AudioRecordingsBulkUploader bookingId={bookingId} />

        {recordings.length > 0 && (
          <div className="mt-4 divide-y divide-anthracite-50 border-t border-anthracite-100">
            {recordings.map((recording, index) => (
              <div
                key={recording.id}
                className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-anthracite-700">
                    {index + 1}. {recording.fileName}
                  </p>
                  <p className="text-xs text-anthracite-400">
                    {formatFileSize(recording.fileSize)} ·{" "}
                    {formatDateTimeGerman(recording.uploadedAt)} Uhr
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  {recording.playUrl && (
                    <audio controls src={recording.playUrl} className="h-9 max-w-[200px]" />
                  )}
                  <a
                    href={`/api/audio-guestbook/file?kind=recording&recordingId=${recording.id}`}
                    className="text-xs font-medium text-gold-700 hover:underline"
                  >
                    Download
                  </a>
                  <DeleteRecordingButton recordingId={recording.id} bookingId={bookingId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

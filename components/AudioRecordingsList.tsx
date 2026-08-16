import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/format";

export function AudioRecordingsList({
  bookingId,
  recordings,
}: {
  bookingId: string;
  recordings: { id: string; fileName: string; fileSize: number; playUrl: string | null }[];
}) {
  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-anthracite-500">
          {recordings.length} Nachricht{recordings.length === 1 ? "" : "en"} eurer Gäste
        </p>
        <a href={`/api/audio-guestbook/download-all?bookingId=${bookingId}`}>
          <Button variant="secondary">Alle Aufnahmen herunterladen</Button>
        </a>
      </div>

      <div className="divide-y divide-anthracite-50 rounded-2xl border border-anthracite-100 bg-white shadow-card">
        {recordings.map((recording, index) => (
          <div key={recording.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-anthracite-800">
                Nachricht {index + 1}
              </p>
              <p className="truncate text-xs text-anthracite-400">
                {recording.fileName} · {formatFileSize(recording.fileSize)}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:flex-none">
              {recording.playUrl && (
                <audio controls src={recording.playUrl} className="h-9 max-w-[220px]" />
              )}
              <a
                href={`/api/audio-guestbook/file?kind=recording&recordingId=${recording.id}`}
                className="flex-none text-sm font-medium text-gold-700 hover:underline"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

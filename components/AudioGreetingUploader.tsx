"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createGreetingUploadTarget,
  confirmGreetingUpload,
} from "@/app/actions/audio-guestbook";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { formatDateGerman, formatDateTimeGerman, formatFileSize } from "@/lib/format";
import {
  AUDIO_GREETING_DEADLINE_DAYS,
  AUDIO_UPLOAD_ACCEPT,
  getAudioGreetingDeadline,
} from "@/lib/types";

const GREETINGS_BUCKET = "audio-guestbook-greetings";

export function AudioGreetingUploader({
  eventDate,
  existingGreeting,
  playUrl,
  downloadHref,
}: {
  eventDate: string;
  existingGreeting: { fileName: string; fileSize: number; uploadedAt: string } | null;
  playUrl: string | null;
  downloadHref: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"view" | "upload">(existingGreeting ? "view" : "upload");
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deadline = getAudioGreetingDeadline(eventDate);
  const now = new Date();
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 3;

  async function uploadFile(file: File) {
    setErrorMessage(null);
    setIsUploading(true);
    try {
      const targetResult = await createGreetingUploadTarget(file.name, file.size);
      if (targetResult.error || !targetResult.target) {
        setErrorMessage(targetResult.error ?? "Upload fehlgeschlagen.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(GREETINGS_BUCKET)
        .uploadToSignedUrl(targetResult.target.path, targetResult.target.token, file);

      if (uploadError) {
        setErrorMessage("Datei-Upload fehlgeschlagen. Bitte versuche es erneut.");
        return;
      }

      const confirmResult = await confirmGreetingUpload(
        targetResult.target.path,
        file.name,
        file.size,
        file.type || "audio/mpeg"
      );
      if (confirmResult.error) {
        setErrorMessage(confirmResult.error);
        return;
      }

      setMode("view");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  if (mode === "view" && existingGreeting) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4">
          <p className="flex items-center gap-2 font-medium text-emerald-800">
            <CheckIcon className="h-5 w-5 flex-none" />
            Begrüßungsnachricht erfolgreich hochgeladen
          </p>
          <div className="mt-2 space-y-0.5 text-sm text-emerald-700">
            <p>Datei: {existingGreeting.fileName}</p>
            <p>Hochgeladen am {formatDateTimeGerman(existingGreeting.uploadedAt)} Uhr</p>
            <p>Größe: {formatFileSize(existingGreeting.fileSize)}</p>
          </div>
          {playUrl && (
            <audio controls src={playUrl} className="mt-3 w-full">
              Dein Browser unterstützt keine Audio-Wiedergabe.
            </audio>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={downloadHref}
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              Herunterladen
            </a>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              Austauschen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border px-4 py-4 text-sm ${
          isOverdue
            ? "border-red-300 bg-red-50 text-red-800"
            : isUrgent
              ? "border-gold-400 bg-gold-50 text-gold-800"
              : "border-anthracite-100 bg-anthracite-50 text-anthracite-600"
        }`}
      >
        <p className={`font-medium ${isOverdue || isUrgent ? "" : "text-anthracite-700"}`}>
          {isOverdue
            ? "Die Frist für eure Begrüßungsnachricht ist bereits verstrichen. Bitte lade sie schnellstmöglich hoch."
            : `Bitte lade deine Begrüßungsnachricht spätestens ${AUDIO_GREETING_DEADLINE_DAYS} Tage vor deiner Veranstaltung hoch.`}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span>Veranstaltungsdatum: {formatDateGerman(eventDate)}</span>
          <span className="font-medium">Upload spätestens bis: {formatDateGerman(deadline.toISOString().slice(0, 10))}</span>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragOver ? "border-gold-500 bg-gold-50" : "border-anthracite-200 bg-white"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-700">
          <UploadIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-medium text-anthracite-800">
            Datei hierher ziehen oder auswählen
          </p>
          <p className="mt-1 text-xs text-anthracite-400">Unterstützt: MP3, WAV, M4A · max. 100 MB</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Lädt hoch…" : "Datei auswählen"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={AUDIO_UPLOAD_ACCEPT}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      )}

      {existingGreeting && (
        <button
          type="button"
          onClick={() => setMode("view")}
          className="text-sm font-medium text-anthracite-400 hover:text-anthracite-700"
        >
          Zurück zur bisherigen Begrüßungsnachricht
        </button>
      )}
    </div>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.5l2.3 2.3L16 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 15V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

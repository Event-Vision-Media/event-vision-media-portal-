"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecordingUploadTargets,
  confirmRecordingUploads,
} from "@/app/actions/admin-audio-guestbook";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { AUDIO_UPLOAD_ACCEPT, AUDIO_UPLOAD_EXTENSIONS, AUDIO_MAX_FILE_SIZE_BYTES } from "@/lib/types";

const RECORDINGS_BUCKET = "audio-guestbook-recordings";
const CONCURRENCY = 4;

type FileStatus = "wartet" | "lädt hoch" | "fertig" | "fehler";

interface QueuedFile {
  file: File;
  status: FileStatus;
  errorMessage?: string;
}

function getExtension(fileName: string): string {
  return (fileName.split(".").pop() || "").toLowerCase();
}

export function AudioRecordingsBulkUploader({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const doneCount = queue.filter((q) => q.status === "fertig").length;
  const errorCount = queue.filter((q) => q.status === "fehler").length;

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setGlobalError(null);

    const initialQueue: QueuedFile[] = files.map((file) => {
      const ext = getExtension(file.name);
      if (!AUDIO_UPLOAD_EXTENSIONS.includes(ext)) {
        return { file, status: "fehler", errorMessage: "Nicht unterstütztes Format" };
      }
      if (file.size > AUDIO_MAX_FILE_SIZE_BYTES) {
        return { file, status: "fehler", errorMessage: "Datei zu groß (max. 100 MB)" };
      }
      return { file, status: "wartet" };
    });
    setQueue(initialQueue);

    const validFiles = initialQueue.filter((q) => q.status === "wartet");
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const targetsResult = await createRecordingUploadTargets(
        bookingId,
        validFiles.map((q) => ({ name: q.file.name, size: q.file.size }))
      );

      if (targetsResult.error || !targetsResult.targets) {
        setGlobalError(targetsResult.error ?? "Upload konnte nicht vorbereitet werden.");
        setQueue((prev) =>
          prev.map((q) => (q.status === "wartet" ? { ...q, status: "fehler" } : q))
        );
        return;
      }

      const targets = targetsResult.targets;
      const supabase = createBrowserSupabaseClient();
      const uploaded: { path: string; fileName: string; fileSize: number; mimeType: string }[] = [];

      let nextIndex = 0;
      async function worker() {
        while (nextIndex < validFiles.length) {
          const currentIndex = nextIndex;
          nextIndex += 1;
          const queuedFile = validFiles[currentIndex];
          const target = targets[currentIndex];

          setQueue((prev) =>
            prev.map((q) => (q.file === queuedFile.file ? { ...q, status: "lädt hoch" } : q))
          );

          const { error } = await supabase.storage
            .from(RECORDINGS_BUCKET)
            .uploadToSignedUrl(target.path, target.token, queuedFile.file);

          if (error) {
            setQueue((prev) =>
              prev.map((q) =>
                q.file === queuedFile.file
                  ? { ...q, status: "fehler", errorMessage: "Upload fehlgeschlagen" }
                  : q
              )
            );
            continue;
          }

          uploaded.push({
            path: target.path,
            fileName: queuedFile.file.name,
            fileSize: queuedFile.file.size,
            mimeType: queuedFile.file.type || "audio/mpeg",
          });
          setQueue((prev) =>
            prev.map((q) => (q.file === queuedFile.file ? { ...q, status: "fertig" } : q))
          );
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, validFiles.length) }, () => worker())
      );

      if (uploaded.length > 0) {
        const confirmResult = await confirmRecordingUploads(bookingId, uploaded);
        if (confirmResult.error) {
          setGlobalError(confirmResult.error);
        } else {
          router.refresh();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void handleFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    void handleFiles(files);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-gold-500 bg-gold-50" : "border-anthracite-200 bg-anthracite-50/50"
        }`}
      >
        <p className="font-medium text-anthracite-800">
          Aufnahmen hierher ziehen oder auswählen
        </p>
        <p className="text-xs text-anthracite-400">
          Beliebig viele Dateien gleichzeitig · MP3, WAV, M4A · max. 100 MB je Datei
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="mt-2"
        >
          {isProcessing ? "Lädt hoch…" : "Aufnahmen hochladen"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={AUDIO_UPLOAD_ACCEPT}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {globalError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{globalError}</p>
      )}

      {queue.length > 0 && (
        <div className="rounded-xl border border-anthracite-100 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-anthracite-700">
            {doneCount}/{queue.length} hochgeladen
            {errorCount > 0 && ` · ${errorCount} fehlgeschlagen`}
          </p>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-anthracite-100">
            <div
              className="h-full rounded-full bg-gold-500 transition-all"
              style={{ width: `${(doneCount / queue.length) * 100}%` }}
            />
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {queue.map((q, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="truncate text-anthracite-600">{q.file.name}</span>
                <span
                  className={`flex-none font-medium ${
                    q.status === "fertig"
                      ? "text-emerald-600"
                      : q.status === "fehler"
                        ? "text-red-600"
                        : "text-anthracite-400"
                  }`}
                >
                  {q.status === "fehler" ? q.errorMessage ?? "Fehler" : q.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

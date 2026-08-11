"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { approveLayoutProof, requestLayoutChanges } from "@/app/actions/layout-proofs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTimeGerman } from "@/lib/format";
import { LAYOUT_PROOF_STATUS_LABELS, type LayoutProof } from "@/lib/types";

function statusTone(status: LayoutProof["status"]) {
  if (status === "freigegeben") return "success" as const;
  if (status === "aenderungen_erforderlich") return "gold" as const;
  return "neutral" as const;
}

export function LayoutProofsSection({
  groupedProofs,
}: {
  groupedProofs: { layoutName: string; versions: LayoutProof[] }[];
}) {
  if (groupedProofs.length === 0) {
    return (
      <div className="rounded-2xl border border-anthracite-100 bg-white p-6 text-center shadow-card">
        <p className="text-sm text-anthracite-500">
          Sobald dein Team ein Layout für dich erstellt hat, erscheint es hier zur Freigabe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupedProofs.map((group) => (
        <LayoutProofCard key={group.layoutName} layoutName={group.layoutName} versions={group.versions} />
      ))}
    </div>
  );
}

function LayoutProofCard({ layoutName, versions }: { layoutName: string; versions: LayoutProof[] }) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const [latest, setLatest] = useState(sorted[0]);
  const history = sorted.slice(1);

  const [showHistory, setShowHistory] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  function handleApprove() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await approveLayoutProof(latest.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setLatest((prev) => ({
        ...prev,
        status: "freigegeben",
        approved_at: new Date().toISOString(),
        customer_feedback: null,
        admin_response: null,
      }));
    });
  }

  function handleSubmitFeedback() {
    setErrorMessage(null);
    if (!feedbackDraft.trim()) {
      setErrorMessage("Bitte beschreibe kurz, was geändert werden soll.");
      return;
    }
    startTransition(async () => {
      const result = await requestLayoutChanges(latest.id, feedbackDraft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setLatest((prev) => ({
        ...prev,
        status: "aenderungen_erforderlich",
        customer_feedback: feedbackDraft,
        customer_feedback_at: new Date().toISOString(),
        admin_response: null,
      }));
      setIsRequestingChanges(false);
      setFeedbackDraft("");
    });
  }

  return (
    <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-anthracite-800">{layoutName}</h3>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(latest.status)}>{LAYOUT_PROOF_STATUS_LABELS[latest.status]}</Badge>
          <span className="text-xs text-anthracite-400">Version {latest.version}</span>
        </div>
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-anthracite-50">
        {latest.file_type === "image" ? (
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            className="group relative block h-full w-full cursor-zoom-in"
          >
            <Image
              src={latest.file_url}
              alt={layoutName}
              fill
              sizes="(max-width: 640px) 100vw, 500px"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-anthracite-900/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ZoomIcon />
              Vergrößern
            </span>
          </button>
        ) : (
          <a
            href={latest.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-anthracite-500 hover:text-anthracite-800"
          >
            <span className="text-sm font-medium underline">PDF ansehen</span>
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-anthracite-400">
        Hochgeladen am {formatDateTimeGerman(latest.created_at)} Uhr
      </p>

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      )}

      {latest.status === "in_pruefung" && !isRequestingChanges && (
        <div className="mt-4 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            disabled={isPending}
            onClick={() => setIsRequestingChanges(true)}
          >
            Änderungen anfordern
          </Button>
          <Button variant="secondary" className="flex-1" disabled={isPending} onClick={handleApprove}>
            {isPending ? "Speichert…" : "Layout freigeben"}
          </Button>
        </div>
      )}

      {latest.status === "in_pruefung" && isRequestingChanges && (
        <div className="mt-4 space-y-3">
          <textarea
            value={feedbackDraft}
            onChange={(e) => setFeedbackDraft(e.target.value)}
            rows={3}
            placeholder="Was soll geändert werden? Z. B. Farben, Text, Anordnung …"
            className="input-field"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              disabled={isPending}
              onClick={() => {
                setIsRequestingChanges(false);
                setFeedbackDraft("");
                setErrorMessage(null);
              }}
            >
              Abbrechen
            </Button>
            <Button className="flex-1" disabled={isPending} onClick={handleSubmitFeedback}>
              {isPending ? "Sendet…" : "Änderungswunsch senden"}
            </Button>
          </div>
        </div>
      )}

      {latest.status === "freigegeben" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ✓
          </span>
          Freigegeben{latest.approved_at && ` am ${formatDateTimeGerman(latest.approved_at)} Uhr`}
        </div>
      )}

      {latest.status === "aenderungen_erforderlich" && latest.customer_feedback && (
        <div className="mt-4 rounded-xl border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-gold-800">
          <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
            Dein Änderungswunsch
            {latest.customer_feedback_at && ` · ${formatDateTimeGerman(latest.customer_feedback_at)} Uhr`}
          </p>
          <p className="mt-1">{latest.customer_feedback}</p>

          {latest.admin_response ? (
            <div className="mt-3 rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-anthracite-500">
                Antwort vom Team
                {latest.admin_response_at && ` · ${formatDateTimeGerman(latest.admin_response_at)} Uhr`}
              </p>
              <p className="mt-1 text-anthracite-700">{latest.admin_response}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs italic text-gold-600">
              Noch nicht bearbeitet — dein Team wurde benachrichtigt.
            </p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-anthracite-100 pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
          >
            {showHistory ? "Frühere Versionen ausblenden" : `${history.length} frühere Version(en) anzeigen`}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {history.map((proof) => (
                <div key={proof.id} className="flex items-center gap-3 opacity-70">
                  <div className="relative h-12 w-16 flex-none overflow-hidden rounded-md bg-anthracite-50">
                    {proof.file_type === "image" && (
                      <Image src={proof.file_url} alt={layoutName} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="font-medium text-anthracite-600">Version {proof.version}</span>{" "}
                    <Badge tone={statusTone(proof.status)}>{LAYOUT_PROOF_STATUS_LABELS[proof.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isZoomed && latest.file_type === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/90 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Schließen"
          >
            ✕
          </button>
          <div className="relative h-full max-h-[85vh] w-full max-w-4xl animate-fade-in-up">
            <Image
              src={latest.file_url}
              alt={layoutName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitPersonalizationDetails,
  approvePersonalizedScreenProof,
  requestPersonalizedScreenChanges,
} from "@/app/actions/personalized-screen";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateGerman, formatDateTimeGerman } from "@/lib/format";
import {
  LAYOUT_PROOF_STATUS_LABELS,
  type PersonalizedScreenProof,
  type PersonalizedScreenRequest,
} from "@/lib/types";

function statusTone(status: PersonalizedScreenProof["status"]) {
  if (status === "freigegeben") return "success" as const;
  if (status === "aenderungen_erforderlich") return "gold" as const;
  return "neutral" as const;
}

export function PersonalizedScreenWorkflow({
  initialRequest,
  proofs,
}: {
  initialRequest: PersonalizedScreenRequest | null;
  proofs: PersonalizedScreenProof[];
}) {
  return (
    <div className="space-y-5">
      <PersonalizationDetailsForm initialRequest={initialRequest} />

      {proofs.length > 0 ? (
        <PersonalizedScreenProofCard versions={proofs} />
      ) : (
        <div className="rounded-2xl border border-dashed border-anthracite-200 bg-white p-5 text-center">
          <p className="text-sm text-anthracite-500">
            Sobald wir euren Startbildschirm gestaltet haben, könnt ihr den Entwurf hier prüfen
            und freigeben.
          </p>
        </div>
      )}
    </div>
  );
}

function PersonalizationDetailsForm({
  initialRequest,
}: {
  initialRequest: PersonalizedScreenRequest | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!initialRequest);
  const [nameDraft, setNameDraft] = useState(initialRequest?.personalization_name ?? "");
  const [dateDraft, setDateDraft] = useState(initialRequest?.personalization_date ?? "");
  const [wishDraft, setWishDraft] = useState(initialRequest?.wish_text ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSave() {
    setErrorMessage(null);
    if (!nameDraft.trim() || !dateDraft.trim()) {
      setErrorMessage("Bitte gebt mindestens Name und Datum an.");
      return;
    }
    const formData = new FormData();
    formData.set("personalization_name", nameDraft);
    formData.set("personalization_date", dateDraft);
    formData.set("wish_text", wishDraft);
    if (photoFile) formData.set("photo", photoFile);

    startTransition(async () => {
      const result = await submitPersonalizationDetails(formData);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setPhotoFile(null);
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-anthracite-800">
          Eure Angaben für den personalisierten Startbildschirm
        </h3>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex-none text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
          >
            Bearbeiten
          </button>
        )}
      </div>

      {!isEditing && initialRequest ? (
        <div className="mt-3 space-y-2 text-sm text-anthracite-700">
          <p>
            <span className="text-anthracite-400">Name:</span>{" "}
            {initialRequest.personalization_name}
          </p>
          <p>
            <span className="text-anthracite-400">Datum:</span>{" "}
            {initialRequest.personalization_date &&
              formatDateGerman(initialRequest.personalization_date)}
          </p>
          {initialRequest.wish_text && (
            <p>
              <span className="text-anthracite-400">Wunschtext:</span> {initialRequest.wish_text}
            </p>
          )}
          {initialRequest.photo_url && (
            <div className="flex items-center gap-3 pt-1">
              <div className="relative h-16 w-16 flex-none overflow-hidden rounded-lg bg-anthracite-50">
                <Image
                  src={initialRequest.photo_url}
                  alt="Hochgeladenes Bild"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <a
                href={initialRequest.photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-anthracite-500 underline hover:text-anthracite-800"
              >
                Bild in voller Größe ansehen
              </a>
            </div>
          )}
          <p className="pt-1 text-xs text-anthracite-400">
            Gespeichert am {formatDateTimeGerman(initialRequest.updated_at)} Uhr
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-anthracite-600">
              Name(n)
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="z. B. Julia & Marco"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-anthracite-600">Datum</label>
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-anthracite-600">
              Wunschtext / Spruch <span className="text-anthracite-400">(optional)</span>
            </label>
            <textarea
              value={wishDraft}
              onChange={(e) => setWishDraft(e.target.value)}
              rows={2}
              placeholder="z. B. euer Lieblingsspruch"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-anthracite-600">
              Bild <span className="text-anthracite-400">(optional, z. B. Brautpaar-Foto)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-anthracite-600 file:mr-4 file:rounded-lg file:border-0 file:bg-anthracite-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-anthracite-700 hover:file:bg-anthracite-200"
            />
            {initialRequest?.photo_url && !photoFile && (
              <p className="mt-1 text-xs text-anthracite-400">
                Bereits ein Bild hochgeladen — neue Auswahl ersetzt es.
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
          )}

          <div className="flex gap-3">
            {initialRequest && (
              <Button
                variant="ghost"
                className="flex-1"
                disabled={isPending}
                onClick={() => {
                  setNameDraft(initialRequest.personalization_name ?? "");
                  setDateDraft(initialRequest.personalization_date ?? "");
                  setWishDraft(initialRequest.wish_text ?? "");
                  setPhotoFile(null);
                  setErrorMessage(null);
                  setIsEditing(false);
                }}
              >
                Abbrechen
              </Button>
            )}
            <Button className="flex-1" disabled={isPending} onClick={handleSave}>
              {isPending ? "Speichert…" : "Angaben speichern"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PersonalizedScreenProofCard({ versions }: { versions: PersonalizedScreenProof[] }) {
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
      const result = await approvePersonalizedScreenProof(latest.id);
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
      const result = await requestPersonalizedScreenChanges(latest.id, feedbackDraft);
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
        <h3 className="font-medium text-anthracite-800">Euer Startbildschirm-Entwurf</h3>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(latest.status)}>{LAYOUT_PROOF_STATUS_LABELS[latest.status]}</Badge>
          <span className="text-xs text-anthracite-400">Version {latest.version}</span>
        </div>
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-anthracite-50">
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="group relative block h-full w-full cursor-zoom-in"
        >
          <Image
            src={latest.file_url}
            alt="Startbildschirm-Entwurf"
            fill
            sizes="(max-width: 640px) 100vw, 500px"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-anthracite-900/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            Vergrößern
          </span>
        </button>
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
            {isPending ? "Speichert…" : "Startbildschirm freigeben"}
          </Button>
        </div>
      )}

      {latest.status === "in_pruefung" && isRequestingChanges && (
        <div className="mt-4 space-y-3">
          <textarea
            value={feedbackDraft}
            onChange={(e) => setFeedbackDraft(e.target.value)}
            rows={3}
            placeholder="Was soll geändert werden? Z. B. Farben, Text, Foto …"
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
                    <Image src={proof.file_url} alt="Frühere Version" fill className="object-cover" />
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

      {isZoomed && (
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
            <Image src={latest.file_url} alt="Startbildschirm-Entwurf" fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

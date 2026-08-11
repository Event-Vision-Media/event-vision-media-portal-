"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLayoutProof, updateAdminResponse } from "@/app/actions/admin-layout-proofs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTimeGerman } from "@/lib/format";
import { LAYOUT_PROOF_STATUS_LABELS, type LayoutProof } from "@/lib/types";

function statusTone(status: LayoutProof["status"]) {
  if (status === "freigegeben") return "success" as const;
  if (status === "aenderungen_erforderlich") return "gold" as const;
  return "neutral" as const;
}

export function LayoutProofGroup({ layoutName, versions }: { layoutName: string; versions: LayoutProof[] }) {
  const [showHistory, setShowHistory] = useState(false);
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const latest = sorted[0];
  const history = sorted.slice(1);

  return (
    <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-anthracite-800">{layoutName}</h3>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(latest.status)}>{LAYOUT_PROOF_STATUS_LABELS[latest.status]}</Badge>
          <span className="text-xs text-anthracite-400">Version {latest.version}</span>
        </div>
      </div>

      <ProofCard proof={latest} bookingId={latest.booking_id} />

      {history.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
          >
            {showHistory ? "Frühere Versionen ausblenden" : `${history.length} frühere Version(en) anzeigen`}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3 border-t border-anthracite-100 pt-3">
              {history.map((proof) => (
                <ProofCard key={proof.id} proof={proof} bookingId={proof.booking_id} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofCard({
  proof,
  bookingId,
  compact = false,
}: {
  proof: LayoutProof;
  bookingId: string;
  compact?: boolean;
}) {
  const [responseDraft, setResponseDraft] = useState(proof.admin_response ?? "");
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function saveResponse() {
    setError(null);
    startTransition(async () => {
      const result = await updateAdminResponse(proof.id, bookingId, responseDraft);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteLayoutProof(proof.id, bookingId);
      router.refresh();
    });
  }

  return (
    <div className={`flex gap-3 ${compact ? "opacity-80" : ""}`}>
      <div className={`relative flex-none overflow-hidden rounded-lg bg-anthracite-50 ${compact ? "h-16 w-24" : "h-32 w-48"}`}>
        {proof.file_type === "image" ? (
          <Image src={proof.file_url} alt={proof.layout_name} fill className="object-cover" />
        ) : (
          <a
            href={proof.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-anthracite-400 hover:text-anthracite-600"
          >
            <span className="text-xs font-medium">PDF öffnen</span>
          </a>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {compact && (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-anthracite-600">Version {proof.version}</span>
            <Badge tone={statusTone(proof.status)}>{LAYOUT_PROOF_STATUS_LABELS[proof.status]}</Badge>
          </div>
        )}
        <p className="text-xs text-anthracite-400">
          Hochgeladen am {formatDateTimeGerman(proof.created_at)} Uhr
          {proof.approved_at && ` · Freigegeben am ${formatDateTimeGerman(proof.approved_at)} Uhr`}
        </p>
        {proof.admin_notes && (
          <p className="mt-1 text-xs italic text-anthracite-400">Notiz: {proof.admin_notes}</p>
        )}

        {proof.customer_feedback && (
          <div className="mt-2 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
              Änderungswunsch{proof.customer_feedback_at && ` · ${formatDateTimeGerman(proof.customer_feedback_at)} Uhr`}
            </p>
            <p className="mt-1">{proof.customer_feedback}</p>
          </div>
        )}

        {proof.customer_feedback && !compact && (
          <div className="mt-2 space-y-2">
            <textarea
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              placeholder="Antwort an den Kunden (z. B. 'Wird in nächster Version berücksichtigt')"
              rows={2}
              className="input-field text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              disabled={isPending}
              onClick={saveResponse}
            >
              Antwort speichern
            </Button>
            {proof.admin_response && (
              <p className="text-xs text-emerald-600">
                ✓ Beantwortet am {formatDateTimeGerman(proof.admin_response_at!)} Uhr
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <div className="mt-2 flex gap-3">
          {confirmingDelete ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-anthracite-500">Löschen?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="font-semibold text-red-600 hover:text-red-800"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="font-medium text-anthracite-400 hover:text-anthracite-700"
              >
                Nein
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-medium text-red-500 hover:text-red-700"
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

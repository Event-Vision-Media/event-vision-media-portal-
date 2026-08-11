"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVariant, updateVariant, updateVariantImage } from "@/app/actions/admin-extras";
import { formatCurrencyEUR } from "@/lib/format";
import type { ExtraVariant } from "@/lib/types";

export function ExtraVariantListItem({ variant }: { variant: ExtraVariant }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [nameDraft, setNameDraft] = useState(variant.name);
  const [descriptionDraft, setDescriptionDraft] = useState(variant.description ?? "");
  const [priceDraft, setPriceDraft] = useState(String(variant.price));
  const [sortOrderDraft, setSortOrderDraft] = useState(String(variant.sort_order));
  const [featuresDraft, setFeaturesDraft] = useState(variant.features ?? "");
  const [isPopularDraft, setIsPopularDraft] = useState(variant.is_popular);
  const [totalStockDraft, setTotalStockDraft] = useState(
    variant.total_stock == null ? "" : String(variant.total_stock)
  );

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await updateVariantImage(variant.id, formData);
      setIsUploading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
    e.target.value = "";
  }

  function toggleAvailable() {
    startTransition(async () => {
      const result = await updateVariant(variant.id, { is_available: !variant.is_available });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function saveEdits() {
    setError(null);
    startTransition(async () => {
      const result = await updateVariant(variant.id, {
        name: nameDraft,
        description: descriptionDraft.trim() || null,
        price: Number(priceDraft) || 0,
        sort_order: Number(sortOrderDraft) || 0,
        features: featuresDraft.trim() || null,
        is_popular: isPopularDraft,
        total_stock: totalStockDraft.trim() === "" ? null : Number(totalStockDraft),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteVariant(variant.id);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gold-200 bg-gold-50/40 p-3 space-y-2">
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Name"
          className="input-field text-sm"
        />
        <textarea
          value={descriptionDraft}
          onChange={(e) => setDescriptionDraft(e.target.value)}
          placeholder="Kurzer Beschreibungstext"
          rows={2}
          className="input-field text-sm"
        />
        <textarea
          value={featuresDraft}
          onChange={(e) => setFeaturesDraft(e.target.value)}
          placeholder="Enthaltene Leistungen, eine pro Zeile"
          rows={4}
          className="input-field text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            placeholder="Preis"
            className="input-field text-sm"
          />
          <input
            type="number"
            value={sortOrderDraft}
            onChange={(e) => setSortOrderDraft(e.target.value)}
            placeholder="Sortierung"
            className="input-field text-sm"
          />
        </div>
        <input
          type="number"
          min="0"
          value={totalStockDraft}
          onChange={(e) => setTotalStockDraft(e.target.value)}
          placeholder="Gesamtbestand (leer = unbegrenzt)"
          className="input-field text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-anthracite-600">
          <input
            type="checkbox"
            checked={isPopularDraft}
            onChange={(e) => setIsPopularDraft(e.target.checked)}
            className="h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
          />
          Als &quot;Beliebt&quot; hervorheben
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveEdits}
            disabled={isPending}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs font-medium text-anthracite-400 hover:text-anthracite-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-anthracite-100 bg-white p-2.5">
      <div className="relative h-12 w-16 flex-none overflow-hidden rounded-md bg-anthracite-50">
        {variant.preview_image_url ? (
          <Image src={variant.preview_image_url} alt={variant.name} fill className="object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-anthracite-800">
          {variant.name}
          {variant.is_popular && (
            <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-700">
              Beliebt
            </span>
          )}
        </p>
        <p className="text-xs text-anthracite-400">
          {formatCurrencyEUR(variant.price)} · Sortierung {variant.sort_order} · Bestand:{" "}
          {variant.total_stock == null ? "unbegrenzt" : variant.total_stock}
          {!variant.is_available && " · nicht verfügbar"}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      <div className="flex flex-none items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="font-medium text-anthracite-600 hover:text-anthracite-900"
        >
          {isUploading ? "…" : "Bild"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="font-medium text-anthracite-600 hover:text-anthracite-900"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={toggleAvailable}
          disabled={isPending}
          className="font-medium text-anthracite-600 hover:text-anthracite-900"
        >
          {variant.is_available ? "Deaktivieren" : "Aktivieren"}
        </button>
        {confirmingDelete ? (
          <>
            <span className="text-anthracite-500">Sicher?</span>
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
          </>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="font-medium text-red-500 hover:text-red-700"
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

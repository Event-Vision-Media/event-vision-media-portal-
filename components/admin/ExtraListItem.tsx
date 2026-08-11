"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExtra, updateExtra, updateExtraImage } from "@/app/actions/admin-extras";
import { ExtraVariantListItem } from "@/components/admin/ExtraVariantListItem";
import { NewVariantForm } from "@/components/admin/NewVariantForm";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR } from "@/lib/format";
import type { Extra, ExtraVariant } from "@/lib/types";

export function ExtraListItem({ extra, variants }: { extra: Extra; variants: ExtraVariant[] }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [nameDraft, setNameDraft] = useState(extra.name);
  const [categoryDraft, setCategoryDraft] = useState(extra.category);
  const [descriptionDraft, setDescriptionDraft] = useState(extra.description ?? "");
  const [priceDraft, setPriceDraft] = useState(String(extra.price));
  const [sortOrderDraft, setSortOrderDraft] = useState(String(extra.sort_order));
  const [totalStockDraft, setTotalStockDraft] = useState(
    extra.total_stock == null ? "" : String(extra.total_stock)
  );

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await updateExtraImage(extra.id, formData);
      setIsUploading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
    e.target.value = "";
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await updateExtra(extra.id, { is_active: !extra.is_active });
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
      const result = await updateExtra(extra.id, {
        name: nameDraft,
        category: categoryDraft.trim() || "Exclusive Extras",
        description: descriptionDraft.trim() || null,
        price: extra.has_variants ? 0 : Number(priceDraft) || 0,
        sort_order: Number(sortOrderDraft) || 0,
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
      await deleteExtra(extra.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-anthracite-100 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-24 flex-none overflow-hidden rounded-lg bg-anthracite-50">
          {extra.preview_image_url ? (
            <Image src={extra.preview_image_url} alt={extra.name} fill className="object-cover" />
          ) : null}
        </div>

        {isEditing ? (
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Name"
              className="input-field text-sm"
            />
            <input
              type="text"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              placeholder="Kategorie, z. B. Exclusive Extras"
              className="input-field text-sm"
            />
            <textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="Kurze Beschreibung"
              rows={2}
              className="input-field text-sm"
            />
            <div className="flex gap-2">
              {!extra.has_variants && (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  placeholder="Preis"
                  className="input-field text-sm"
                />
              )}
              <input
                type="number"
                value={sortOrderDraft}
                onChange={(e) => setSortOrderDraft(e.target.value)}
                placeholder="Sortierung"
                className="input-field text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                min="0"
                value={totalStockDraft}
                onChange={(e) => setTotalStockDraft(e.target.value)}
                placeholder="Gesamtbestand (leer = unbegrenzt)"
                className="input-field text-sm"
              />
              <p className="mt-0.5 text-[11px] text-anthracite-400">
                {extra.has_variants
                  ? "Nur ausfüllen, wenn sich alle Pakete/Varianten einen gemeinsamen Bestand teilen (z. B. Anzahl Geräte)."
                  : "Leer lassen für unbegrenzte Verfügbarkeit."}
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
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
        ) : (
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-anthracite-800">{extra.name}</h3>
              <Badge tone="gold">{extra.category}</Badge>
              {extra.has_variants && <Badge tone="neutral">Varianten</Badge>}
              {!extra.is_active && <Badge tone="neutral">Inaktiv</Badge>}
            </div>
            {extra.description && (
              <p className="mt-1 text-sm text-anthracite-500">{extra.description}</p>
            )}
            <p className="mt-1 text-xs text-anthracite-400">
              {extra.has_variants ? "Preis je Variante" : formatCurrencyEUR(extra.price)} ·
              Sortierung {extra.sort_order} · Bestand:{" "}
              {extra.total_stock == null ? "unbegrenzt" : extra.total_stock}
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <div className="flex flex-none flex-col items-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="font-medium text-anthracite-600 hover:text-anthracite-900"
          >
            {isUploading ? "Lädt…" : "Bild ändern"}
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-medium text-anthracite-600 hover:text-anthracite-900"
            >
              Bearbeiten
            </button>
          )}
          <button
            type="button"
            onClick={toggleActive}
            disabled={isPending}
            className="font-medium text-anthracite-600 hover:text-anthracite-900"
          >
            {extra.is_active ? "Deaktivieren" : "Aktivieren"}
          </button>
          {confirmingDelete ? (
            <span className="flex items-center gap-2">
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
            </span>
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

      {extra.has_variants && (
        <div className="mt-4 space-y-2 border-t border-anthracite-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-anthracite-400">
            Varianten
          </p>
          {variants.map((variant) => (
            <ExtraVariantListItem key={variant.id} variant={variant} />
          ))}
          {variants.length === 0 && (
            <p className="text-sm text-anthracite-400">Noch keine Varianten angelegt.</p>
          )}
          <NewVariantForm extraId={extra.id} />
        </div>
      )}
    </div>
  );
}

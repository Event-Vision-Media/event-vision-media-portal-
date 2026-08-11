"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteHomeScreen,
  updateHomeScreenImage,
  updateHomeScreenName,
  updateHomeScreenSortOrder,
} from "@/app/actions/admin";
import type { HomeScreen } from "@/lib/types";

export function HomeScreenListItem({ homeScreen }: { homeScreen: HomeScreen }) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(homeScreen.name);
  const [isEditingSortOrder, setIsEditingSortOrder] = useState(false);
  const [sortOrderDraft, setSortOrderDraft] = useState(String(homeScreen.sort_order));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteHomeScreen(homeScreen.id);
      router.refresh();
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.set("image", file);

    startTransition(async () => {
      const result = await updateHomeScreenImage(homeScreen.id, formData);
      setIsUploading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });

    e.target.value = "";
  }

  function saveName() {
    if (nameDraft.trim() === homeScreen.name) {
      setIsEditingName(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateHomeScreenName(homeScreen.id, nameDraft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditingName(false);
      router.refresh();
    });
  }

  function cancelNameEdit() {
    setNameDraft(homeScreen.name);
    setIsEditingName(false);
  }

  function saveSortOrder() {
    const value = parseInt(sortOrderDraft, 10);
    if (value === homeScreen.sort_order) {
      setIsEditingSortOrder(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateHomeScreenSortOrder(homeScreen.id, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditingSortOrder(false);
      router.refresh();
    });
  }

  function cancelSortOrderEdit() {
    setSortOrderDraft(String(homeScreen.sort_order));
    setIsEditingSortOrder(false);
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-anthracite-100 bg-white p-3 shadow-soft">
      <div className="relative h-16 w-12 flex-none overflow-hidden rounded-lg bg-anthracite-50">
        <Image
          src={homeScreen.preview_image_url}
          alt={homeScreen.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") cancelNameEdit();
                }}
                autoFocus
                className="rounded border border-anthracite-200 px-2 py-1 text-sm text-anthracite-800 focus:border-gold-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={isPending}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={cancelNameEdit}
                className="text-xs font-medium text-anthracite-400 hover:text-anthracite-700"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="font-medium text-anthracite-800 hover:underline"
              title="Namen bearbeiten"
            >
              {homeScreen.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-anthracite-400">
          <span>Sortierung:</span>
          {isEditingSortOrder ? (
            <span className="inline-flex items-center gap-2">
              <input
                type="number"
                value={sortOrderDraft}
                onChange={(e) => setSortOrderDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveSortOrder();
                  if (e.key === "Escape") cancelSortOrderEdit();
                }}
                autoFocus
                className="w-16 rounded border border-anthracite-200 px-1 py-0.5 text-xs text-anthracite-800 focus:border-gold-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={saveSortOrder}
                disabled={isPending}
                className="font-medium text-emerald-600 hover:text-emerald-800"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={cancelSortOrderEdit}
                className="font-medium text-anthracite-400 hover:text-anthracite-700"
              >
                Abbrechen
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingSortOrder(true)}
              className="font-medium text-anthracite-600 hover:underline"
              title="Sortierung bearbeiten (kleinere Zahl = weiter vorne)"
            >
              {homeScreen.sort_order}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex flex-none items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs font-medium text-anthracite-600 hover:text-anthracite-900 disabled:opacity-50"
        >
          {isUploading ? "Lädt hoch…" : "Bild ändern"}
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-anthracite-500">Sicher?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs font-semibold text-red-600 hover:text-red-800"
            >
              {isPending ? "…" : "Ja, löschen"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-xs font-medium text-anthracite-400 hover:text-anthracite-700"
            >
              Nein
            </button>
          </div>
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
  );
}

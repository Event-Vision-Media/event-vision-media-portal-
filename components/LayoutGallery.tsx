"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { selectLayout, selectLayoutWithPersonalization } from "@/app/actions/booking";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR } from "@/lib/format";
import { LAYOUT_CATEGORIES, type Layout } from "@/lib/types";

type ModalStep = "preview" | "personalize";

export function LayoutGallery({
  inclusiveLayouts,
  premiumLayouts,
  selectedLayoutId,
  coupleNames,
  initialPersonalizationName,
  initialPersonalizationDate,
  initialExtraWishes,
  hasConsentedBefore,
  premiumIncluded,
}: {
  inclusiveLayouts: Layout[];
  premiumLayouts: Layout[];
  selectedLayoutId: string | null;
  coupleNames: string;
  initialPersonalizationName: string | null;
  initialPersonalizationDate: string | null;
  initialExtraWishes: string | null;
  hasConsentedBefore: boolean;
  premiumIncluded: boolean;
}) {
  const [activeLayout, setActiveLayout] = useState<Layout | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("preview");
  const [currentSelectedId, setCurrentSelectedId] = useState(selectedLayoutId);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState(initialPersonalizationName ?? coupleNames);
  const [dateDraft, setDateDraft] = useState(initialPersonalizationDate ?? "");
  const [wishesDraft, setWishesDraft] = useState(initialExtraWishes ?? "");
  const [consentDraft, setConsentDraft] = useState(hasConsentedBefore);

  const availableCategories = LAYOUT_CATEGORIES.filter((category) =>
    premiumLayouts.some((layout) => layout.category === category)
  );
  const visiblePremiumLayouts = activeCategory
    ? premiumLayouts.filter((layout) => layout.category === activeCategory)
    : premiumLayouts;

  function openLayout(layout: Layout) {
    setErrorMessage(null);
    setModalStep("preview");
    setActiveLayout(layout);
  }

  function closeModal() {
    setActiveLayout(null);
    setModalStep("preview");
  }

  function goToPersonalize() {
    setErrorMessage(null);
    setModalStep("personalize");
  }

  function handleSkipPersonalization() {
    if (!activeLayout) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectLayout(activeLayout.id, activeLayout.is_premium);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setCurrentSelectedId(activeLayout.id);
      closeModal();
    });
  }

  function handleSavePersonalization() {
    if (!activeLayout) return;
    setErrorMessage(null);

    if (!consentDraft) {
      setErrorMessage(
        "Bitte bestätige den Datenschutzhinweis, damit wir deine Angaben speichern dürfen."
      );
      return;
    }

    startTransition(async () => {
      const result = await selectLayoutWithPersonalization(activeLayout.id, activeLayout.is_premium, {
        name: nameDraft,
        date: dateDraft,
        wishes: wishesDraft,
      });
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setCurrentSelectedId(activeLayout.id);
      closeModal();
    });
  }

  const selectedLayout = [...inclusiveLayouts, ...premiumLayouts].find(
    (l) => l.id === currentSelectedId
  );

  return (
    <div className="space-y-10">
      {errorMessage && modalStep === "preview" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {selectedLayout?.is_premium && (
        <div className="animate-fade-in-up rounded-xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white px-4 py-4 text-sm text-gold-800 shadow-sm">
          {premiumIncluded ? (
            <>
              <strong>Premium-Layout ausgewählt</strong> – bei eurer Buchung bereits inklusive,
              es entstehen keine Zusatzkosten.
            </>
          ) : (
            <>
              <strong>Premium-Layout ausgewählt</strong> – die Zusatzkosten von{" "}
              {formatCurrencyEUR(selectedLayout.extra_price)} werden dir separat in
              Rechnung gestellt.
            </>
          )}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-anthracite-800" />
          <h2 className="font-serif text-xl font-semibold tracking-tight text-anthracite-800">
            Inklusive Layouts
          </h2>
        </div>
        <LayoutGrid
          layouts={inclusiveLayouts}
          selectedLayoutId={currentSelectedId}
          onOpen={openLayout}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-gold-500" />
          <h2 className="font-serif text-xl font-semibold tracking-tight text-anthracite-800">
            Premium Layouts
          </h2>
          <Badge tone="gold">{premiumIncluded ? "Inklusive" : "+25 €"}</Badge>
        </div>

        {availableCategories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeCategory === null
                  ? "bg-anthracite-800 text-white shadow-sm"
                  : "border border-anthracite-200 bg-white text-anthracite-500 hover:border-gold-300 hover:text-anthracite-700"
              }`}
            >
              Alle
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-anthracite-800 text-white shadow-sm"
                    : "border border-anthracite-200 bg-white text-anthracite-500 hover:border-gold-300 hover:text-anthracite-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <LayoutGrid
          layouts={visiblePremiumLayouts}
          selectedLayoutId={currentSelectedId}
          onOpen={openLayout}
        />
      </section>

      {activeLayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/70 p-4 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card-hover animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {modalStep === "preview" ? (
              <>
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-anthracite-50">
                  <Image
                    src={activeLayout.preview_image_url}
                    alt={activeLayout.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 512px"
                    className="object-cover"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-anthracite-800">
                      {activeLayout.name}
                    </h3>
                    {activeLayout.is_premium ? (
                      <p className="text-sm text-gold-600">
                        Premium
                        {activeLayout.category ? ` · ${activeLayout.category}` : ""} ·{" "}
                        {premiumIncluded
                          ? "inklusive"
                          : `+${formatCurrencyEUR(activeLayout.extra_price)}`}
                      </p>
                    ) : (
                      <p className="text-sm text-anthracite-400">Inklusive</p>
                    )}
                  </div>
                  {currentSelectedId === activeLayout.id && (
                    <Badge tone="success">Ausgewählt</Badge>
                  )}
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={closeModal}>
                    Schließen
                  </Button>
                  <Button className="flex-1" onClick={goToPersonalize}>
                    Dieses Layout wählen
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-serif text-lg font-semibold text-anthracite-800">
                  Personalisierung für &quot;{activeLayout.name}&quot;
                </h3>
                <p className="mt-1 text-sm text-anthracite-500">
                  Gib jetzt direkt an, was auf eurer Grafik stehen soll — oder füll das
                  später auf der Personalisierungs-Seite aus.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-anthracite-600">
                      Name(n) fürs Layout
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
                    <label className="mb-1 block text-sm font-medium text-anthracite-600">
                      Datum fürs Layout
                    </label>
                    <input
                      type="date"
                      value={dateDraft}
                      onChange={(e) => setDateDraft(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-anthracite-600">
                      Zusatzwunsch
                    </label>
                    <textarea
                      value={wishesDraft}
                      onChange={(e) => setWishesDraft(e.target.value)}
                      rows={3}
                      placeholder="Sprüche, Farbwünsche, spezielle Anordnung …"
                      className="input-field"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-anthracite-100 bg-anthracite-50 p-3">
                    <input
                      type="checkbox"
                      checked={consentDraft}
                      onChange={(e) => setConsentDraft(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-anthracite-300 text-gold-500 focus:ring-gold-400"
                    />
                    <span className="text-xs text-anthracite-600">
                      Ich bin damit einverstanden, dass die angegebenen personenbezogenen
                      Daten (Name, Datum) von Event Vision Media zur Erstellung meines
                      personalisierten Layouts gespeichert und verarbeitet werden.
                    </span>
                  </label>
                </div>

                {errorMessage && (
                  <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  <Button disabled={isPending} onClick={handleSavePersonalization}>
                    {isPending ? "Speichert…" : "Speichern"}
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setModalStep("preview")}
                    >
                      Zurück
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      disabled={isPending}
                      onClick={handleSkipPersonalization}
                    >
                      Später ausfüllen
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutGrid({
  layouts,
  selectedLayoutId,
  onOpen,
}: {
  layouts: Layout[];
  selectedLayoutId: string | null;
  onOpen: (layout: Layout) => void;
}) {
  if (layouts.length === 0) {
    return <p className="text-sm text-anthracite-400">Aktuell keine Layouts verfügbar.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {layouts.map((layout) => {
        const isSelected = layout.id === selectedLayoutId;
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onOpen(layout)}
            className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
              isSelected
                ? "border-gold-500 ring-4 ring-gold-200"
                : "border-anthracite-100/80 hover:border-gold-300"
            }`}
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-anthracite-50">
              <Image
                src={layout.preview_image_url}
                alt={layout.name}
                fill
                sizes="(max-width: 640px) 50vw, 260px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
                  ✓
                </span>
              )}
              {layout.is_premium && (
                <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Premium
                </span>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-anthracite-800">
                {layout.name}
              </p>
              {layout.category && (
                <p className="truncate text-xs text-anthracite-400">{layout.category}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

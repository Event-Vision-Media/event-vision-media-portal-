"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { selectHomeScreen, selectSimpleExtra, removeExtra } from "@/app/actions/booking";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrencyEUR } from "@/lib/format";
import { getHomeScreenAspect, SELECTION_SWITCH_FEE, type Extra, type HomeScreen } from "@/lib/types";

type PreviewStep = "preview" | "fee-warning";

export function StartscreenGallery({
  productType,
  homeScreens,
  selectedHomeScreenId,
  personalizedExtra,
  isPersonalizedBooked,
  isPersonalizedLocked,
  personalizedExampleImageUrl,
}: {
  productType: string;
  homeScreens: HomeScreen[];
  selectedHomeScreenId: string | null;
  personalizedExtra: Extra | null;
  isPersonalizedBooked: boolean;
  isPersonalizedLocked: boolean;
  personalizedExampleImageUrl: string | null;
}) {
  const [currentSelectedId, setCurrentSelectedId] = useState(selectedHomeScreenId);
  const [previewScreen, setPreviewScreen] = useState<HomeScreen | null>(null);
  const [previewStep, setPreviewStep] = useState<PreviewStep>("preview");
  const [showExamplePreview, setShowExamplePreview] = useState(false);
  const [wantsPersonalized, setWantsPersonalized] = useState(isPersonalizedBooked);
  const [personalizedBooked, setPersonalizedBooked] = useState(isPersonalizedBooked);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState(false);

  const currentHomeScreenName = homeScreens.find((h) => h.id === currentSelectedId)?.name ?? null;

  const aspect = getHomeScreenAspect(productType);
  const exampleImage = personalizedExampleImageUrl ?? personalizedExtra?.preview_image_url ?? null;

  function handleSelect(homeScreen: HomeScreen) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectHomeScreen(homeScreen.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setCurrentSelectedId(homeScreen.id);
      setFeeNotice(Boolean(result.feeAdded));
      setPreviewScreen(null);
      setPreviewStep("preview");
    });
  }

  function handleChooseClick(homeScreen: HomeScreen) {
    if (currentSelectedId && currentSelectedId !== homeScreen.id) {
      setPreviewStep("fee-warning");
    } else {
      handleSelect(homeScreen);
    }
  }

  function handleConfirmPersonalized() {
    if (!personalizedExtra) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectSimpleExtra(personalizedExtra.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setPersonalizedBooked(true);
      setCurrentSelectedId(null);
    });
  }

  function handleRemovePersonalized() {
    if (!personalizedExtra || isPersonalizedLocked) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await removeExtra(personalizedExtra.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setPersonalizedBooked(false);
      setWantsPersonalized(false);
    });
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      )}

      {feeNotice && (
        <div className="animate-fade-in-up rounded-xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white px-4 py-4 text-sm text-gold-800 shadow-sm">
          Startbildschirm gewechselt – für den Wechsel wurde ein Aufpreis von{" "}
          {formatCurrencyEUR(SELECTION_SWITCH_FEE)} zu eurer Buchung hinzugefügt.
        </div>
      )}

      <section>
        {homeScreens.length === 0 ? (
          <p className="text-sm text-anthracite-400">
            Für euer Produkt sind aktuell noch keine Startbildschirme hinterlegt. Meldet euch
            gerne bei uns.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {homeScreens.map((homeScreen) => {
              const isSelected = homeScreen.id === currentSelectedId;
              return (
                <button
                  key={homeScreen.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setPreviewStep("preview");
                    setPreviewScreen(homeScreen);
                  }}
                  className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover disabled:opacity-60 ${
                    isSelected
                      ? "border-gold-500 ring-4 ring-gold-200"
                      : "border-anthracite-100/80 hover:border-gold-300"
                  }`}
                >
                  <div className={`relative w-full overflow-hidden bg-anthracite-50 ${aspect.class}`}>
                    <Image
                      src={homeScreen.preview_image_url}
                      alt={homeScreen.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 260px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-anthracite-800">
                      {homeScreen.name}
                    </p>
                    {isSelected && (
                      <p className="mt-0.5 text-xs font-medium text-emerald-600">Ausgewählt</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {personalizedExtra && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {exampleImage && (
              <button
                type="button"
                onClick={() => setShowExamplePreview(true)}
                className="group relative h-20 w-28 flex-none self-start overflow-hidden rounded-xl bg-anthracite-50 shadow-sm ring-1 ring-anthracite-100"
                title="Beispielbild vergrößern"
              >
                <Image
                  src={exampleImage}
                  alt={personalizedExtra.name}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-anthracite-900/0 transition-colors group-hover:bg-anthracite-900/30">
                  <ZoomIcon className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-anthracite-800">{personalizedExtra.name}</h3>
                  <Badge tone="gold">Optional</Badge>
                </div>
                <p className="flex-none font-serif text-lg font-semibold text-gold-700">
                  {formatCurrencyEUR(personalizedExtra.price)}
                </p>
              </div>
              {personalizedExtra.description && (
                <p className="mt-1 text-sm text-anthracite-500">
                  {personalizedExtra.description}
                </p>
              )}
            </div>
          </div>

          {!personalizedBooked && !wantsPersonalized && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => setWantsPersonalized(true)}
            >
              Ich möchte einen personalisierten Startbildschirm
            </Button>
          )}

          {!personalizedBooked && wantsPersonalized && (
            <div className="mt-4 animate-fade-in-up rounded-xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white p-4">
              <p className="text-sm text-anthracite-700">
                Bestätigt hier verbindlich, dass ihr einen individuell für euch gestalteten
                Startbildschirm bucht. Der Preis wird euch separat in Rechnung gestellt.
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => setWantsPersonalized(false)}
                >
                  Zurück
                </Button>
                <Button
                  className="flex-1"
                  disabled={isPending}
                  onClick={handleConfirmPersonalized}
                >
                  {isPending ? "Speichert…" : "Ich habe mich für einen personalisierten Bildschirm entschieden"}
                </Button>
              </div>
            </div>
          )}

          {personalizedBooked && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  ✓
                </span>
                {isPersonalizedLocked
                  ? "Personalisierter Startbildschirm bereits gebucht."
                  : "Personalisierter Startbildschirm gebucht."}
              </span>
              {!isPersonalizedLocked && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRemovePersonalized}
                  className="flex-none text-xs font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-900 disabled:opacity-50"
                >
                  Entfernen
                </button>
              )}
            </div>
          )}
          {personalizedBooked && isPersonalizedLocked && (
            <p className="mt-2 text-xs text-anthracite-400">
              Bereits für euch gebucht. Bei Änderungswünschen meldet euch bitte bei uns.
            </p>
          )}
        </Card>
      )}

      {previewScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/70 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewScreen(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card-hover animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {previewStep === "preview" ? (
              <>
                <div className={`relative w-full overflow-hidden rounded-xl bg-anthracite-50 ${aspect.class}`}>
                  <Image
                    src={previewScreen.preview_image_url}
                    alt={previewScreen.name}
                    fill
                    sizes="512px"
                    className="object-contain"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="font-medium text-anthracite-800">{previewScreen.name}</h3>
                  {previewScreen.id === currentSelectedId && <Badge tone="success">Ausgewählt</Badge>}
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => setPreviewScreen(null)}>
                    Schließen
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={isPending || previewScreen.id === currentSelectedId}
                    onClick={() => handleChooseClick(previewScreen)}
                  >
                    {previewScreen.id === currentSelectedId
                      ? "Bereits ausgewählt"
                      : isPending
                        ? "Speichert…"
                        : "Diesen Startbildschirm wählen"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-serif text-lg font-semibold text-anthracite-800">
                  Startbildschirm wechseln?
                </h3>
                <p className="mt-3 text-sm text-anthracite-600">
                  Ihr habt bereits <strong>{currentHomeScreenName ?? "einen anderen Startbildschirm"}</strong>{" "}
                  ausgewählt und dieser wird bereits individuell für euch vorbereitet. Ein Wechsel
                  zu <strong>{previewScreen.name}</strong> ist möglich, kostet aber einmalig{" "}
                  <strong>{formatCurrencyEUR(SELECTION_SWITCH_FEE)}</strong> Aufpreis.
                </p>
                <div className="mt-5 flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => setPreviewStep("preview")}>
                    Zurück
                  </Button>
                  <Button className="flex-1" disabled={isPending} onClick={() => handleSelect(previewScreen)}>
                    {isPending
                      ? "Speichert…"
                      : `Trotzdem wechseln (+${formatCurrencyEUR(SELECTION_SWITCH_FEE)})`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showExamplePreview && exampleImage && personalizedExtra && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/70 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowExamplePreview(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card-hover animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-anthracite-50">
              <Image
                src={exampleImage}
                alt={personalizedExtra.name}
                fill
                sizes="512px"
                className="object-contain"
              />
            </div>
            <h3 className="mt-4 font-medium text-anthracite-800">{personalizedExtra.name}</h3>
            <Button variant="ghost" className="mt-5 w-full" onClick={() => setShowExamplePreview(false)}>
              Schließen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

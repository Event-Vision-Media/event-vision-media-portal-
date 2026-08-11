"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import {
  confirmExtras,
  confirmNoExtras,
  removeExtra,
  selectExtraVariant,
  selectSimpleExtra,
} from "@/app/actions/booking";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrencyEUR, formatDateTimeGerman } from "@/lib/format";
import { formatAvailabilityLabel, type AvailabilityInfo } from "@/lib/availability";
import type { BookingExtra, Extra, ExtraVariant } from "@/lib/types";

function availabilityTone(status: AvailabilityInfo["status"]) {
  if (status === "ausgebucht") return "danger" as const;
  if (status === "wenige") return "gold" as const;
  return "success" as const;
}

function AvailabilityBadge({ info }: { info: AvailabilityInfo | undefined }) {
  if (!info || info.status === "unbegrenzt") return null;
  return <Badge tone={availabilityTone(info.status)}>{formatAvailabilityLabel(info)}</Badge>;
}

export function ExtrasSection({
  extras,
  variantsByExtra,
  initialSelections,
  initialConfirmedAt,
  availabilityByExtraId,
  availabilityByVariantId,
}: {
  extras: Extra[];
  variantsByExtra: Record<string, ExtraVariant[]>;
  initialSelections: BookingExtra[];
  initialConfirmedAt: string | null;
  availabilityByExtraId: Record<string, AvailabilityInfo>;
  availabilityByVariantId: Record<string, AvailabilityInfo>;
}) {
  const [selections, setSelections] = useState(initialSelections);
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt);
  const [activeExtra, setActiveExtra] = useState<Extra | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectionByExtraId = useMemo(() => {
    const map = new Map<string, BookingExtra>();
    selections.forEach((s) => map.set(s.extra_id, s));
    return map;
  }, [selections]);

  const newSelections = selections.filter(
    (s) => !s.added_by_admin && extras.some((e) => e.id === s.extra_id)
  );
  const total = newSelections.reduce((sum, s) => sum + s.price, 0);

  function openExtra(extra: Extra) {
    setErrorMessage(null);
    setActiveExtra(extra);
  }

  function handleSelectSimple(extra: Extra) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectSimpleExtra(extra.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setSelections((prev) => [
        ...prev.filter((s) => s.extra_id !== extra.id),
        {
          id: crypto.randomUUID(),
          booking_id: "",
          extra_id: extra.id,
          variant_id: null,
          price: extra.price,
          added_by_admin: false,
        },
      ]);
      setConfirmedAt(null);
      setActiveExtra(null);
    });
  }

  function handleSelectVariant(extra: Extra, variant: ExtraVariant) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectExtraVariant(extra.id, variant.id);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setSelections((prev) => [
        ...prev.filter((s) => s.extra_id !== extra.id),
        {
          id: crypto.randomUUID(),
          booking_id: "",
          extra_id: extra.id,
          variant_id: variant.id,
          price: variant.price,
          added_by_admin: false,
        },
      ]);
      setConfirmedAt(null);
      setActiveExtra(null);
    });
  }

  function handleRemove(extraId: string) {
    if (selectionByExtraId.get(extraId)?.added_by_admin) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await removeExtra(extraId);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setSelections((prev) => prev.filter((s) => s.extra_id !== extraId));
      setConfirmedAt(null);
      setActiveExtra(null);
    });
  }

  function handleConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await confirmExtras();
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setConfirmedAt(new Date().toISOString());
      setIsConfirming(false);
    });
  }

  function handleConfirmNoExtras() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await confirmNoExtras();
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setConfirmedAt(new Date().toISOString());
    });
  }

  if (extras.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-5 w-1 rounded-full bg-gold-500" />
        <h2 className="font-serif text-xl font-semibold tracking-tight text-anthracite-800">
          Exclusive Extras
        </h2>
        <Badge tone="gold">Optional</Badge>
      </div>

      {errorMessage && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {extras.map((extra) => {
          const selection = selectionByExtraId.get(extra.id);
          const variants = variantsByExtra[extra.id] ?? [];
          const selectedVariant = selection?.variant_id
            ? variants.find((v) => v.id === selection.variant_id)
            : undefined;
          const minVariantPrice = variants.length
            ? Math.min(...variants.map((v) => v.price))
            : 0;
          // Kartenweiter Status nur zeigen, wenn der Bestand auf Extra-Ebene
          // geführt wird (einfache Extras oder geteilter Paket-Bestand wie
          // Audiogästebuch). Bei Varianten mit eigenem Bestand (Hintergründe)
          // wird der Status erst im Detail je Variante gezeigt.
          const cardAvailability = availabilityByExtraId[extra.id];

          return (
            <button
              key={extra.id}
              type="button"
              onClick={() => openExtra(extra)}
              className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
                selection
                  ? "border-gold-500 ring-4 ring-gold-200"
                  : "border-anthracite-100/80 hover:border-gold-300"
              }`}
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden bg-anthracite-50">
                {extra.preview_image_url && (
                  <Image
                    src={extra.preview_image_url}
                    alt={extra.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 360px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Exclusive Extra
                </span>
                {selection && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
                    ✓
                  </span>
                )}
              </div>
              <div className="p-3.5">
                <p className="font-medium text-anthracite-800">{extra.name}</p>
                {extra.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-anthracite-400">
                    {extra.description}
                  </p>
                )}
                <p className="mt-2 text-sm font-medium text-gold-700">
                  {extra.has_variants
                    ? `ab ${formatCurrencyEUR(minVariantPrice)}`
                    : formatCurrencyEUR(extra.price)}
                </p>
                {cardAvailability && cardAvailability.status !== "unbegrenzt" && (
                  <div className="mt-1.5">
                    <AvailabilityBadge info={cardAvailability} />
                  </div>
                )}
                {selection && (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    {selection.added_by_admin ? "✓ Bereits gebucht" : "✓ Ausgewählt"}
                    {selectedVariant ? `: ${selectedVariant.name}` : ""}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {newSelections.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-300 bg-gradient-to-br from-gold-50 to-white px-4 py-3 text-sm text-gold-800 shadow-sm">
          <span>Extras gesamt</span>
          <strong className="font-serif text-base">{formatCurrencyEUR(total)}</strong>
        </div>
      )}

      {selections.length > 0 && confirmedAt && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ✓
          </span>
          Exclusive Extras gebucht am {formatDateTimeGerman(confirmedAt)} Uhr.
        </div>
      )}

      {newSelections.length > 0 && !confirmedAt && (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => setIsConfirming(true)}
        >
          Jetzt Exclusive Extras buchen
        </Button>
      )}

      {selections.length === 0 && confirmedAt && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ✓
          </span>
          Keine Exclusive Extras gewünscht – bestätigt am {formatDateTimeGerman(confirmedAt)} Uhr.
        </div>
      )}

      {selections.length === 0 && !confirmedAt && (
        <button
          type="button"
          onClick={handleConfirmNoExtras}
          disabled={isPending}
          className="mt-4 text-sm font-medium text-anthracite-400 underline decoration-anthracite-200 underline-offset-4 transition hover:text-anthracite-700 disabled:opacity-50"
        >
          {isPending ? "Speichert…" : "Keine Exclusive Extras gewünscht"}
        </button>
      )}

      {isConfirming && (
        <ConfirmationModal
          extras={extras}
          variantsByExtra={variantsByExtra}
          selections={newSelections}
          total={total}
          isPending={isPending}
          error={errorMessage}
          availabilityByExtraId={availabilityByExtraId}
          availabilityByVariantId={availabilityByVariantId}
          onClose={() => setIsConfirming(false)}
          onConfirm={handleConfirm}
        />
      )}

      {activeExtra && (
        <ExtraModal
          extra={activeExtra}
          variants={variantsByExtra[activeExtra.id] ?? []}
          selection={selectionByExtraId.get(activeExtra.id)}
          isPending={isPending}
          extraAvailability={availabilityByExtraId[activeExtra.id]}
          availabilityByVariantId={availabilityByVariantId}
          onClose={() => setActiveExtra(null)}
          onSelectSimple={() => handleSelectSimple(activeExtra)}
          onSelectVariant={(variant) => handleSelectVariant(activeExtra, variant)}
          onRemove={() => handleRemove(activeExtra.id)}
        />
      )}
    </section>
  );
}

function ExtraModal({
  extra,
  variants,
  selection,
  isPending,
  extraAvailability,
  availabilityByVariantId,
  onClose,
  onSelectSimple,
  onSelectVariant,
  onRemove,
}: {
  extra: Extra;
  variants: ExtraVariant[];
  selection?: BookingExtra;
  isPending: boolean;
  extraAvailability?: AvailabilityInfo;
  availabilityByVariantId: Record<string, AvailabilityInfo>;
  onClose: () => void;
  onSelectSimple: () => void;
  onSelectVariant: (variant: ExtraVariant) => void;
  onRemove: () => void;
}) {
  const isLocked = Boolean(selection?.added_by_admin);
  const isSimpleSoldOut = !extra.has_variants && extraAvailability?.status === "ausgebucht" && !selection;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-card-hover animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <h3 className="font-serif text-lg font-semibold text-anthracite-800">{extra.name}</h3>
          <Badge tone="gold">Exclusive Extra</Badge>
        </div>
        {extra.description && (
          <p className="mb-4 text-sm text-anthracite-500">{extra.description}</p>
        )}

        {isLocked && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              ✓
            </span>
            Diese Option wurde bereits für euch gebucht. Bei Änderungswünschen meldet euch bitte
            bei uns.
          </div>
        )}

        {extra.has_variants ? (
          <div className="space-y-3">
            {variants
              .filter((v) => v.is_available)
              .map((variant) => {
                const isSelected = selection?.variant_id === variant.id;
                const variantAvailability = availabilityByVariantId[variant.id];
                const isVariantSoldOut =
                  variantAvailability?.status === "ausgebucht" && !isSelected;
                const features = (variant.features ?? "")
                  .split("\n")
                  .map((f) => f.trim())
                  .filter(Boolean);

                return (
                  <div
                    key={variant.id}
                    className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                      isSelected
                        ? "border-gold-500 ring-4 ring-gold-200 shadow-sm"
                        : "border-anthracite-100 hover:border-gold-200"
                    }`}
                  >
                    {variant.preview_image_url && (
                      <div className="relative aspect-[3/2] w-full bg-anthracite-50">
                        <Image
                          src={variant.preview_image_url}
                          alt={variant.name}
                          fill
                          sizes="480px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-anthracite-800">{variant.name}</p>
                          {variant.is_popular && <Badge tone="gold">Beliebt</Badge>}
                        </div>
                        <p className="flex-none font-medium text-gold-700">
                          {formatCurrencyEUR(variant.price)}
                        </p>
                      </div>
                      {variantAvailability && variantAvailability.status !== "unbegrenzt" && (
                        <div className="mt-1.5">
                          <AvailabilityBadge info={variantAvailability} />
                        </div>
                      )}
                      {variant.description && (
                        <p className="mt-1 text-sm text-anthracite-500">{variant.description}</p>
                      )}
                      {features.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-anthracite-600">
                              <span className="mt-0.5 text-emerald-500">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        className="mt-4 w-full"
                        disabled={isPending || isLocked || isVariantSoldOut}
                        variant={isSelected ? "ghost" : "primary"}
                        onClick={() =>
                          !isSelected && !isLocked && !isVariantSoldOut && onSelectVariant(variant)
                        }
                      >
                        {isSelected
                          ? isLocked
                            ? "✓ Bereits gebucht"
                            : "✓ Ausgewählt"
                          : isVariantSoldOut
                            ? "Für dieses Datum ausgebucht"
                            : "Paket auswählen"}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-xl border border-anthracite-100 bg-gradient-to-br from-anthracite-50 to-white px-4 py-3 text-sm text-anthracite-700">
            <div className="flex items-center justify-between gap-2">
              <p className="font-serif text-lg font-medium text-gold-700">
                {formatCurrencyEUR(extra.price)}
              </p>
              {extraAvailability && extraAvailability.status !== "unbegrenzt" && (
                <AvailabilityBadge info={extraAvailability} />
              )}
            </div>
            <p className="mt-1 text-xs text-anthracite-400">
              wird dir separat in Rechnung gestellt
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Schließen
          </Button>
          {!extra.has_variants && !isLocked && (
            <Button
              className="flex-1"
              disabled={isPending || isSimpleSoldOut}
              variant={selection ? "ghost" : "primary"}
              onClick={selection ? onRemove : isSimpleSoldOut ? undefined : onSelectSimple}
            >
              {isPending
                ? "Speichert…"
                : selection
                  ? "Entfernen"
                  : isSimpleSoldOut
                    ? "Für dieses Datum ausgebucht"
                    : "Auswählen"}
            </Button>
          )}
          {extra.has_variants && selection && !isLocked && (
            <Button
              variant="ghost"
              className="flex-1"
              disabled={isPending}
              onClick={onRemove}
            >
              Entfernen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({
  extras,
  variantsByExtra,
  selections,
  total,
  isPending,
  error,
  availabilityByExtraId,
  availabilityByVariantId,
  onClose,
  onConfirm,
}: {
  extras: Extra[];
  variantsByExtra: Record<string, ExtraVariant[]>;
  selections: BookingExtra[];
  total: number;
  isPending: boolean;
  error: string | null;
  availabilityByExtraId: Record<string, AvailabilityInfo>;
  availabilityByVariantId: Record<string, AvailabilityInfo>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const items = selections.map((selection) => {
    const extra = extras.find((e) => e.id === selection.extra_id);
    const variant = selection.variant_id
      ? (variantsByExtra[selection.extra_id] ?? []).find((v) => v.id === selection.variant_id)
      : undefined;
    const availability = variant
      ? availabilityByVariantId[variant.id]
      : availabilityByExtraId[selection.extra_id];
    return {
      key: selection.id,
      label: variant ? `${extra?.name ?? "Extra"} – ${variant.name}` : extra?.name ?? "Extra",
      price: selection.price,
      availability,
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-anthracite-900/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card-hover animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-anthracite-800">
          Eure Auswahl bestätigen
        </h3>
        <p className="mt-1 mb-4 text-sm text-anthracite-500">
          Bitte prüft eure gewählten Exclusive Extras noch einmal.
        </p>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border border-anthracite-100 bg-anthracite-50/60 px-3 py-2.5 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-anthracite-700">{item.label}</span>
                <span className="font-medium text-gold-700">{formatCurrencyEUR(item.price)}</span>
              </div>
              {item.availability && item.availability.status !== "unbegrenzt" && (
                <div className="mt-1.5">
                  <AvailabilityBadge info={item.availability} />
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-anthracite-100 pt-4 text-sm">
          <span className="font-medium text-anthracite-800">Gesamt</span>
          <span className="font-serif text-lg font-semibold text-gold-700">
            {formatCurrencyEUR(total)}
          </span>
        </div>
        <p className="mt-1 text-xs text-anthracite-400">
          Wird dir separat in Rechnung gestellt — hier wird nichts bezahlt.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Zurück
          </Button>
          <Button variant="secondary" className="flex-1" disabled={isPending} onClick={onConfirm}>
            {isPending ? "Speichert…" : "Jetzt verbindlich buchen"}
          </Button>
        </div>
      </div>
    </div>
  );
}

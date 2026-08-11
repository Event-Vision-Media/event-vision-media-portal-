"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePersonalizedScreenExample } from "@/app/actions/admin";

export function PersonalizedScreenExampleUpload({
  productType,
  exampleImageUrl,
}: {
  productType: string;
  exampleImageUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("image", file);

    startTransition(async () => {
      const result = await updatePersonalizedScreenExample(productType, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });

    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-anthracite-200 bg-anthracite-50/50 p-3">
      <div className="relative h-16 w-24 flex-none overflow-hidden rounded-lg bg-anthracite-100">
        {exampleImageUrl ? (
          <Image src={exampleImageUrl} alt={`Beispielbild ${productType}`} fill className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-anthracite-400">
            Kein Bild
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-anthracite-700">
          Beispielbild „Personalisierter Startbildschirm“
        </p>
        <p className="text-xs text-anthracite-400">
          Wird auf der Startbildschirm-Seite bei {productType}-Buchungen gezeigt.
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
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
        disabled={isPending}
        className="flex-none text-xs font-medium text-anthracite-600 hover:text-anthracite-900 disabled:opacity-50"
      >
        {isPending ? "Lädt hoch…" : exampleImageUrl ? "Bild ändern" : "Bild hochladen"}
      </button>
    </div>
  );
}

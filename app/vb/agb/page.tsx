import type { Metadata } from "next";
import Link from "next/link";
import { LANDLORD } from "@/lib/contract";

export const metadata: Metadata = { title: "AGB – VisionBooth", robots: { index: false, follow: false } };

// PLATZHALTER: AGB und Widerrufsbelehrung für VisionBooth müssen vor dem Live-Start rechtlich geprüft eingefügt werden.
export default function VisionBoothTermsPage() {
  return (
    <main className="vb px-6 py-16" style={{ ["--a" as string]: "#c4933f" }}>
      <div className="relative mx-auto max-w-2xl">
        <Link href="/vb" className="text-sm text-white/55 hover:text-white">← VisionBooth</Link>
        <h1 className="vb-display mt-6 text-4xl font-semibold">Allgemeine Geschäftsbedingungen</h1>
        <p className="mt-6 rounded-2xl bg-amber-300/10 px-5 py-4 text-amber-100">Die AGB für VisionBooth werden gerade erstellt. Bei Fragen: {LANDLORD.phone} · {LANDLORD.email}</p>
      </div>
    </main>
  );
}

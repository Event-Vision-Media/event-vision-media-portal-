import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BookingFlow } from "@/components/visionbooth/site/BookingFlow";
import { VB_PLANS, type VbPlanId } from "@/components/visionbooth/packages";
import { stripeTestMode } from "@/lib/visionbooth-shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "VisionBooth buchen", robots: { index: false, follow: true } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

/** Online-Buchung: Anlass → Paket → Details → Bezahlen (Stripe). */
export default async function VisionBoothBookingPage(props: { searchParams: Promise<{ paket?: string; abbruch?: string }> }) {
  const searchParams = await props.searchParams;
  const plan = VB_PLANS.find((p) => p.id === searchParams.paket && !p.id.startsWith("addon"))?.id ?? null;
  return (
    <main className="vb" style={{ ["--a" as string]: "#c4933f" }}>
      <div className="vb-aurora" aria-hidden />
      <nav className="relative mx-auto flex max-w-xl items-center justify-between px-5 py-5">
        <Link href="/vb" className="vb-display text-xl font-semibold">
          Vision<span className="vb-gold-text">Booth</span>
        </Link>
        <Link href="/vb" className="text-sm text-white/55 hover:text-white">
          ✕ Abbrechen
        </Link>
      </nav>
      <div className="relative">
        <BookingFlow initialPlan={plan as VbPlanId | null} cancelled={Boolean(searchParams.abbruch)} testMode={stripeTestMode()} />
      </div>
    </main>
  );
}

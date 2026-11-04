import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { fulfillOrder } from "@/lib/visionbooth-shop";
import { LANDLORD } from "@/lib/contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Danke für deine Buchung – VisionBooth", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0c" };

/** Nach der Zahlung: Bestellung prüfen, Event einrichten (falls der Webhook noch nicht war) und direkt in den Kundenbereich. */
export default async function VisionBoothThanksPage(props: { searchParams: Promise<{ session_id?: string }> }) {
  const searchParams = await props.searchParams;
  const sid = searchParams.session_id ?? "";
  const res = /^cs_[A-Za-z0-9_]+$/.test(sid) ? await fulfillOrder(sid).catch(() => ({ order: null, error: "Wir konnten die Zahlung gerade nicht prüfen." })) : { order: null, error: "Ungültiger Link." };
  const ok = "manageUrl" in res && res.manageUrl;

  return (
    <main className="vb flex flex-col items-center justify-center px-6 text-center" style={{ ["--a" as string]: "#c4933f" }}>
      <div className="vb-aurora" aria-hidden />
      <div className="relative w-full max-w-md">
        {ok ? (
          <>
            <p className="vb-points text-7xl">🎉</p>
            <h1 className="vb-display vb-gold-text mt-4 text-4xl font-semibold">Eure VisionBooth ist startklar!</h1>
            <p className="mt-3 text-white/70">
              Danke{res.order?.name ? `, ${res.order.name.split(" ")[0]}` : ""}! Die Zahlung ist angekommen. Deinen persönlichen Link haben wir dir auch per E-Mail an <strong className="text-white">{res.order?.email}</strong> geschickt.
            </p>
            <a href={res.manageUrl} className="vb-btn mt-8 block rounded-full py-4 text-[17px] font-bold">
              Jetzt gestalten &amp; QR-Code holen
            </a>
            <p className="mt-4 text-xs text-white/45">Tipp: Lege dir den Link als Lesezeichen an – damit verwaltest du alles bis nach dem Event.</p>
          </>
        ) : (
          <>
            <p className="text-6xl">⏳</p>
            <h1 className="vb-display mt-4 text-3xl font-semibold">Einen Moment …</h1>
            <p className="mt-3 text-white/70">{res.error}</p>
            <p className="mt-6 text-sm text-white/55">
              Fragen? {LANDLORD.phone} · {LANDLORD.email}
            </p>
            <Link href="/vb" className="mt-6 inline-block text-sm underline underline-offset-4">
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

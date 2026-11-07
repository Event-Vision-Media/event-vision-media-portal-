import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadVbEventByToken } from "@/lib/visionbooth";
import { QrPoster } from "@/components/visionbooth/QrPoster";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "QR-Aufsteller – VisionBooth", robots: { index: false, follow: false } };

/** QR-Aufsteller für den Kunden (Zugang über den Verwaltungs-Link). */
export default async function VisionBoothCustomerPosterPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const event = await loadVbEventByToken(params.token);
  if (!event) notFound();
  return <QrPoster event={event} />;
}

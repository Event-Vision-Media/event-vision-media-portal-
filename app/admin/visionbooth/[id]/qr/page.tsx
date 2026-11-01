import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VbEvent } from "@/lib/visionbooth";
import { QrPoster } from "@/components/visionbooth/QrPoster";

export const dynamic = "force-dynamic";

/** Druckvorlage A5 hoch: Tischaufsteller mit QR-Code (im Browser drucken oder als PDF sichern). */
export default async function VisionBoothQrPrintPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const { data } = await createAdminClient().from("vb_events").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  return <QrPoster event={data as VbEvent} />;
}

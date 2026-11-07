import { NextResponse, type NextRequest } from "next/server";
import { fulfillOrder, verifyStripeSignature } from "@/lib/visionbooth-shop";

export const dynamic = "force-dynamic";

/** Stripe meldet abgeschlossene Zahlungen – Event wird eingerichtet, auch wenn der Kunde die Danke-Seite nie erreicht. */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  }
  const event = JSON.parse(payload);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const res = await fulfillOrder(event.data.object.id);
    if (res.error && !res.order) return NextResponse.json({ error: res.error }, { status: 404 });
  }
  return NextResponse.json({ received: true });
}

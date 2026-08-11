import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function escapeCsvField(value: string) {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const [{ data: bookings, error }, { data: bookingExtras }] = await Promise.all([
    adminClient.from("bookings").select("*, layouts(name)").order("event_date", { ascending: true }),
    adminClient
      .from("booking_extras")
      .select("booking_id, price, added_by_admin, extras(name), extra_variants(name)"),
  ]);

  if (error) {
    return NextResponse.json({ error: "Export fehlgeschlagen." }, { status: 500 });
  }

  const extrasByBooking = new Map<string, { label: string; price: number; addedByAdmin: boolean }[]>();
  (bookingExtras ?? []).forEach((be: any) => {
    const label = be.extra_variants?.name
      ? `${be.extras?.name} – ${be.extra_variants.name}`
      : be.extras?.name ?? "Extra";
    const list = extrasByBooking.get(be.booking_id) ?? [];
    list.push({ label, price: be.price, addedByAdmin: be.added_by_admin });
    extrasByBooking.set(be.booking_id, list);
  });

  const relevantBookings = (bookings ?? []).filter(
    (b) => b.is_premium_selected || b.extra_wishes || extrasByBooking.has(b.id)
  );

  const header = [
    "Buchungscode",
    "Namen",
    "Event-Datum",
    "Produkt",
    "Layout",
    "Premium",
    "Exclusive Extras",
    "Extras gesamt (neu zu berechnen)",
    "Extras bereits abgerechnet (vorab)",
    "Extras verbindlich gebucht am",
    "Sonderwünsche",
  ];

  const rows = relevantBookings.map((b) => {
    const extras = extrasByBooking.get(b.id) ?? [];
    const newTotal = extras.filter((e) => !e.addedByAdmin).reduce((sum, e) => sum + e.price, 0);
    const vorabTotal = extras.filter((e) => e.addedByAdmin).reduce((sum, e) => sum + e.price, 0);
    return [
      b.booking_code,
      b.couple_names,
      b.event_date,
      b.product_type,
      b.layouts?.name ?? "",
      b.is_premium_selected ? "Ja" : "Nein",
      extras
        .map((e) => `${e.label} (${e.price.toFixed(2)} €${e.addedByAdmin ? ", vorab" : ""})`)
        .join(", "),
      newTotal ? `${newTotal.toFixed(2)} €` : "",
      vorabTotal ? `${vorabTotal.toFixed(2)} €` : "",
      b.extras_confirmed_at ? new Date(b.extras_confirmed_at).toLocaleString("de-DE") : "",
      b.extra_wishes ?? "",
    ]
      .map((field) => escapeCsvField(String(field)))
      .join(";");
  });

  const csv = ["﻿" + header.join(";"), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-vision-media-zusatzwuensche-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}

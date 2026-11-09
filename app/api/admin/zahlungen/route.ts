import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/require-admin";
import { loadIncome, monthRange } from "@/lib/payment-journal";

export const dynamic = "force-dynamic";

/** Geldeingänge eines Monats als CSV (Excel-tauglich: Semikolon, deutsches Komma, UTF-8 mit BOM). */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const month = req.nextUrl.searchParams.get("monat") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Monat fehlt (z. B. 2026-11)." }, { status: 400 });
  const r = monthRange(month);
  const entries = (await loadIncome(r.from, r.to)).sort((a, b) => a.date.localeCompare(b.date));
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ["Datum", "Kunde", "Buchung", "Art", "Zahlweg", "Betrag (EUR)", "Event"].join(";"),
    ...entries.map((e) =>
      [
        new Date(e.date).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
        q(e.customer),
        q(e.code),
        e.kind,
        e.method,
        e.amount.toFixed(2).replace(".", ","),
        e.eventDate ? new Date(e.eventDate + "T12:00:00Z").toLocaleDateString("de-DE") : "",
      ].join(";")
    ),
    ["", "", "", "", "Summe", entries.reduce((s, e) => s + e.amount, 0).toFixed(2).replace(".", ","), ""].join(";"),
  ];
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zahlungseingaenge-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

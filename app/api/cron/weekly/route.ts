import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWeeklyPlan } from "@/lib/weekly-plan";
import { mondayOf } from "@/lib/calendar";
import { sendEmail, weeklyPlanMail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SENT_KEY = "weekly_plan_sent";

/**
 * Wochenplan an dich (Vercel Cron, sonntags abends – siehe vercel.json): Einsätze der
 * kommenden Woche, offene To-dos, Geräte-Check, Vorschau. Kommt jede Woche, auch ohne Einsätze.
 * Lokal zum Testen: /api/cron/weekly?dry=1 (zeigt die Mail, verschickt nichts),
 * mit &woche=YYYY-MM-DD für eine bestimmte Woche.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";
  const authorized = secret ? req.headers.get("authorization") === `Bearer ${secret}` : isDev;
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const week = req.nextUrl.searchParams.get("woche") ?? "";
  const plan = await buildWeeklyPlan(dry && /^\d{4}-\d{2}-\d{2}$/.test(week) ? mondayOf(week) : undefined);
  const mail = weeklyPlanMail(plan);
  if (dry) {
    return new NextResponse(mail.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const to = process.env.ADMIN_EMAIL;
  if (!to) return NextResponse.json({ ok: false, error: "ADMIN_EMAIL fehlt" }, { status: 500 });

  // Nicht doppelt verschicken, falls der Cron einmal zweimal anläuft
  const supabase = createAdminClient();
  const { data: last } = await supabase.from("app_settings").select("value").eq("key", SENT_KEY).maybeSingle();
  if (last?.value === plan.weekStart) return NextResponse.json({ ok: true, skipped: "already sent", week: plan.weekStart });

  const res = await sendEmail({ to, ...mail });
  if (res.sent) await supabase.from("app_settings").upsert({ key: SENT_KEY, value: plan.weekStart, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return NextResponse.json({ ok: res.sent, week: plan.weekStart, events: plan.eventCount, todos: plan.todos.length });
}

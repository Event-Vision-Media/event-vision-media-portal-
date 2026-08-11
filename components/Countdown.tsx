"use client";

import { useEffect, useState } from "react";

function getRemaining(targetDate: string) {
  const diffMs = new Date(targetDate + "T00:00:00").getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    isPast: diffMs < 0,
  };
}

export function Countdown({ eventDate }: { eventDate: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(eventDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(eventDate));
    }, 60_000);
    return () => clearInterval(interval);
  }, [eventDate]);

  if (remaining.isPast) {
    return (
      <div className="rounded-2xl bg-anthracite-800 px-6 py-8 text-center text-white shadow-card">
        <p className="text-lg font-medium">Euer Event hat bereits stattgefunden 🎉</p>
        <p className="mt-1 text-sm text-anthracite-200">
          Wir hoffen, ihr hattet eine wundervolle Zeit!
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-anthracite-900 via-anthracite-800 to-anthracite-700 px-6 py-8 text-center text-white shadow-card">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />

      <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-gold-300">
        Countdown bis zu eurem Event
      </p>
      <div className="relative mt-5 flex items-center justify-center gap-3 sm:gap-5">
        <TimeBlock value={remaining.days} label="Tage" />
        <Divider />
        <TimeBlock value={remaining.hours} label="Stunden" />
        <Divider />
        <TimeBlock value={remaining.minutes} label="Minuten" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[72px] rounded-xl border border-white/10 bg-white/5 px-2 py-3 backdrop-blur-sm sm:min-w-[88px]">
      <div className="font-serif text-4xl font-bold text-gold-300 sm:text-5xl">
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-anthracite-300">
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-white/10" />;
}

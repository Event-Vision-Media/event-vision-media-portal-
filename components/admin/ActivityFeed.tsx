"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markActivityRead, markAllActivityRead } from "@/app/actions/admin-activity";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTimeGerman } from "@/lib/format";

export interface ActivityFeedEntry {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  bookingCode: string | null;
}

export function ActivityFeed({ entries }: { entries: ActivityFeedEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const unreadCount = entries.filter((e) => !e.read_at).length;
  const visibleEntries = expanded ? entries : entries.slice(0, 6);

  if (entries.length === 0) {
    return null;
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markActivityRead(id);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllActivityRead();
      router.refresh();
    });
  }

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-semibold text-anthracite-800">Aktivität</h2>
          {unreadCount > 0 && <Badge tone="gold">{unreadCount} neu</Badge>}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
          >
            Alle als gelesen markieren
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleEntries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
              entry.read_at ? "bg-transparent" : "bg-gold-50"
            }`}
          >
            <div className="min-w-0">
              <p className="text-anthracite-700">
                {entry.bookingCode && (
                  <span className="font-medium text-anthracite-800">{entry.bookingCode} · </span>
                )}
                {entry.message}
              </p>
              <p className="text-xs text-anthracite-400">
                {formatDateTimeGerman(entry.created_at)} Uhr
              </p>
            </div>
            {!entry.read_at && (
              <button
                type="button"
                onClick={() => handleMarkRead(entry.id)}
                disabled={isPending}
                className="flex-none text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
              >
                Gelesen
              </button>
            )}
          </div>
        ))}
      </div>

      {entries.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-anthracite-500 hover:text-anthracite-800"
        >
          {expanded ? "Weniger anzeigen" : `Alle ${entries.length} anzeigen`}
        </button>
      )}
    </Card>
  );
}

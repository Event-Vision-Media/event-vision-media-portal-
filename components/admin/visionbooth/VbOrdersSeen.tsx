"use client";

import { useEffect } from "react";
import { markVbOrdersSeen } from "@/app/actions/admin-activity";

/** Beim Öffnen der Bestellliste: neue VisionBooth-Buchungen im Aktivitäts-Feed als gesehen markieren. */
export function VbOrdersSeen() {
  useEffect(() => {
    markVbOrdersSeen().catch(() => {});
  }, []);
  return null;
}

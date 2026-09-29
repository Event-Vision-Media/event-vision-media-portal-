"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton({ label = "Drucken / als PDF speichern" }: { label?: string }) {
  return (
    <Button type="button" variant="ghost" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}

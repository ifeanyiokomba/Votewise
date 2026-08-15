"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} size="sm" className="gap-2">
      <ShieldCheck className="h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}

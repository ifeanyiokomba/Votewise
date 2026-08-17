"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Radio, Loader2 } from "lucide-react";

type Visibility = "LIVE" | "AFTER_CLOSE" | "PUBLISHED_ONLY";

const OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    value: "LIVE",
    label: "Real-time results",
    description: "Show live turnout while voting is in progress. Candidate tallies are hidden until close to protect privacy.",
    icon: Radio,
  },
  {
    value: "AFTER_CLOSE",
    label: "Results after close",
    description: "Hide all results until voting closes. Full results visible after the election ends.",
    icon: EyeOff,
  },
  {
    value: "PUBLISHED_ONLY",
    label: "Published only",
    description: "Results are only visible after you manually publish them. Maximum control.",
    icon: Lock,
  },
];

export function ResultVisibilityControl({ electionId }: { electionId: string }) {
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled || !electionId) return;
      const res = await apiFetch<{ resultVisibility: string }>(
        `/api/elections/${electionId}/result-visibility`
      );
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setVisibility(res.data.resultVisibility as Visibility);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  async function saveVisibility(mode: Visibility) {
    if (!electionId || mode === visibility) return;
    setSaving(true);
    const res = await apiFetch<{ resultVisibility: string }>(
      `/api/elections/${electionId}/result-visibility`,
      {
        method: "PATCH",
        body: JSON.stringify({ resultVisibility: mode }),
      }
    );
    setSaving(false);
    if (!res.success) {
      toast.error("Could not update visibility", { description: res.error?.message });
      return;
    }
    setVisibility(mode);
    toast.success("Result visibility updated", {
      description: OPTIONS.find((o) => o.value === mode)?.label,
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-48" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!visibility) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Result visibility</p>
          <Badge variant="outline" className="text-[10px]">
            {OPTIONS.find((o) => o.value === visibility)?.label}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Control when voters can see results. Changes take effect immediately.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = visibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => saveVisibility(opt.value)}
                disabled={saving}
                className={cn(
                  "group flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-accent/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {saving && isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className={cn("text-xs font-semibold", isActive && "text-primary")}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

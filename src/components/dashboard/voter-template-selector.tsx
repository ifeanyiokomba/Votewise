"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Palette, Loader2, Check } from "lucide-react";

export const VOTER_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Calm institutional look with subtle gradients. Default Votewise feel.",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    accent: "text-blue-600",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Vibrant gradient hero with floating accents. Eye-catching and contemporary.",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    accent: "text-fuchsia-600",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-style layout with serif headings and generous whitespace.",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    accent: "text-amber-700",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Stripped-back monochrome design. Maximum clarity, zero noise.",
    gradient: "from-zinc-600 via-zinc-500 to-zinc-400",
    accent: "text-zinc-700",
  },
  {
    id: "regal",
    name: "Regal",
    description: "Dark ceremonial theme with gold accents — for high-stakes elections.",
    gradient: "from-yellow-600 via-amber-700 to-zinc-900",
    accent: "text-amber-500",
  },
  {
    id: "civic",
    name: "Civic",
    description: "Official government blue with seal-style elements.",
    gradient: "from-sky-700 via-blue-700 to-indigo-800",
    accent: "text-sky-700",
  },
] as const;

export type VoterTemplateId = (typeof VOTER_TEMPLATES)[number]["id"];

export function VoterTemplateSelector({ electionId }: { electionId: string }) {
  const [current, setCurrent] = useState<VoterTemplateId>("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled || !electionId) return;
      const res = await apiFetch<{ voterTemplate: VoterTemplateId }>(
        `/api/elections/${electionId}/voter-template`
      );
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setCurrent(res.data.voterTemplate);
      }
    })();
    return () => { cancelled = true; };
  }, [electionId]);

  async function apply(id: VoterTemplateId) {
    setSaving(id);
    const res = await apiFetch(`/api/elections/${electionId}/voter-template`, {
      method: "PATCH",
      body: JSON.stringify({ voterTemplate: id }),
    });
    setSaving(null);
    if (!res.success) {
      toast.error("Could not apply template", { description: res.error?.message });
      return;
    }
    setCurrent(id);
    const t = VOTER_TEMPLATES.find((x) => x.id === id);
    toast.success(`${t?.name ?? "Template"} applied`, {
      description: "Voters will see the new design on their voting page.",
    });
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" />
          Voter page template
        </CardTitle>
        <CardDescription className="text-xs">
          Pick a visual theme for the page your voters will interact with. Preview each
          design before applying — changes take effect immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VOTER_TEMPLATES.map((t) => {
              const isActive = current === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => apply(t.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                    isActive ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                >
                  {/* Preview gradient */}
                  <div className={cn("mb-3 h-14 w-full rounded-lg bg-gradient-to-br", t.gradient)} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{t.name}</p>
                    {isActive && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[9px] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Check className="h-2.5 w-2.5" /> Active
                      </Badge>
                    )}
                    {saving === t.id && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[10px] text-muted-foreground">
          Templates only change visual styling — your election data, voters, and rules stay the same.
        </p>
      </CardContent>
    </Card>
  );
}

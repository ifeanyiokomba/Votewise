"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { Trophy, TrendingUp, Users, Vote, Medal, ArrowRight } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  name: string;
  status: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  voters: number;
  votes: number;
  positions: number;
  candidates: number;
  turnout: number;
}

interface EngagementData {
  leaderboard: LeaderboardEntry[];
  summary: {
    totalVoters: number;
    totalVotes: number;
    avgTurnout: number;
    electionsWithVoters: number;
    activeCount: number;
    bestElection: LeaderboardEntry | null;
  };
}

const MEDAL_COLORS = [
  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
];

export function EngagementLeaderboard() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"all" | "week" | "month" | "quarter">("all");

  const load = useCallback(async (r: string) => {
    setLoading(true);
    const res = await apiFetch<EngagementData>(`/api/admin/engagement?range=${r}`);
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load(range);
    })();
    return () => {
      cancelled = true;
    };
  }, [range, load]);

  const RANGES: { key: typeof range; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "quarter", label: "90 days" },
    { key: "month", label: "30 days" },
    { key: "week", label: "7 days" },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return null;
  }

  const { leaderboard, summary } = data;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Turnout leaderboard
            </CardTitle>
            <CardDescription className="text-xs">
              Engagement across elections with registered voters
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex gap-0.5 rounded-lg border bg-muted/30 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                    range === r.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Badge variant="outline" className="gap-1.5">
              <TrendingUp className="h-3 w-3 text-primary" />
              {formatPercent(summary.avgTurnout)} avg
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-px border-b bg-muted/30">
          <div className="bg-background p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatNumber(summary.totalVoters)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total voters</p>
          </div>
          <div className="bg-background p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Vote className="h-3 w-3" />
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatNumber(summary.totalVotes)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total votes</p>
          </div>
          <div className="bg-background p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatPercent(summary.avgTurnout)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg turnout</p>
          </div>
        </div>

        {/* Leaderboard list */}
        <ScrollArea className="max-h-[24rem] scroll-area-custom">
          <div className="space-y-1 p-3">
            {leaderboard.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
              >
                <Link
                  href={`/dashboard/elections/${entry.id}`}
                  className="group flex items-center gap-3 rounded-lg border bg-background p-3 transition-all hover:border-primary/30 hover:bg-accent/40"
                >
                  {/* Rank medal */}
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                      idx < 3
                        ? MEDAL_COLORS[idx]
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx < 3 ? <Medal className="h-4 w-4" /> : idx + 1}
                  </div>

                  {/* Election info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{entry.name}</p>
                      <StatusBadge status={entry.status} className="shrink-0 scale-90" />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{formatNumber(entry.voters)} voters</span>
                      <span>{formatNumber(entry.votes)} votes</span>
                      <span>{entry.positions} positions</span>
                    </div>
                  </div>

                  {/* Turnout bar */}
                  <div className="hidden w-32 shrink-0 sm:block">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Turnout</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatPercent(entry.turnout)}
                      </span>
                    </div>
                    <Progress
                      value={entry.turnout}
                      className="mt-0.5 h-1.5"
                    />
                  </div>

                  {/* Turnout % on mobile */}
                  <div className="shrink-0 text-right sm:hidden">
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {formatPercent(entry.turnout)}
                    </p>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

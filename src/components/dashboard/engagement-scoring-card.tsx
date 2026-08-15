"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, maskEmail } from "@/lib/utils";
import {
  Trophy,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  Vote,
  Award,
  Flame,
} from "lucide-react";

interface ScoredVoter {
  id: string;
  name: string;
  email: string;
  uniqueIdentifier: string;
  isEligible: boolean;
  electionName: string;
  electionStatus: string;
  verified: boolean;
  voted: boolean;
  score: number;
  breakdown: string[];
}

interface ScoringData {
  leaderboard: ScoredVoter[];
  summary: {
    totalVoters: number;
    verifiedCount: number;
    votedCount: number;
    avgScore: number;
    topScore: number;
    engagementRate: number;
  };
  distribution: { label: string; count: number }[];
}

const RANK_STYLES = [
  { medal: "🥇", bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
  { medal: "🥈", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-300" },
  { medal: "🥉", bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300" },
];

const SCORE_TIERS = [
  { min: 81, label: "Speed Voter", icon: Flame, color: "text-rose-600 dark:text-rose-400" },
  { min: 51, label: "Active Voter", icon: Vote, color: "text-emerald-600 dark:text-emerald-400" },
  { min: 31, label: "Verified", icon: CheckCircle2, color: "text-sky-600 dark:text-sky-400" },
  { min: 1, label: "Beginner", icon: Zap, color: "text-amber-600 dark:text-amber-400" },
];

function getTier(score: number) {
  return SCORE_TIERS.find((t) => score >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1];
}

export function EngagementScoringCard() {
  const [data, setData] = useState<ScoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const res = await apiFetch<ScoringData>("/api/admin/engagement-scoring");
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setData(res.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) {
    return (
      <Card>
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const { leaderboard, summary, distribution } = data;

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Voter engagement scores
            </CardTitle>
            <CardDescription className="text-xs">
              Gamified participation scoring across your electorate
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <TrendingUp className="h-3 w-3 text-primary" />
            {summary.engagementRate}% engaged
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-px border-b bg-muted/30">
          <div className="bg-background p-2.5 text-center">
            <Users className="mx-auto h-3 w-3 text-muted-foreground" />
            <p className="mt-1 text-base font-bold tabular-nums">{formatNumber(summary.totalVoters)}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Voters</p>
          </div>
          <div className="bg-background p-2.5 text-center">
            <CheckCircle2 className="mx-auto h-3 w-3 text-sky-500" />
            <p className="mt-1 text-base font-bold tabular-nums">{formatNumber(summary.verifiedCount)}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Verified</p>
          </div>
          <div className="bg-background p-2.5 text-center">
            <Vote className="mx-auto h-3 w-3 text-emerald-500" />
            <p className="mt-1 text-base font-bold tabular-nums">{formatNumber(summary.votedCount)}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Voted</p>
          </div>
          <div className="bg-background p-2.5 text-center">
            <Trophy className="mx-auto h-3 w-3 text-amber-500" />
            <p className="mt-1 text-base font-bold tabular-nums">{summary.topScore}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Top score</p>
          </div>
        </div>

        {/* Score distribution */}
        <div className="border-b bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Score distribution
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {distribution.map((bucket, idx) => {
              const pct = summary.totalVoters > 0 ? (bucket.count / summary.totalVoters) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{bucket.label.split("—")[1]?.trim() ?? bucket.label}</span>
                    <span className="font-semibold tabular-nums">{bucket.count}</span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <ScrollArea className="max-h-[20rem] scroll-area-custom">
          <div className="space-y-1 p-3">
            {leaderboard.map((voter, idx) => {
              const tier = getTier(voter.score);
              const TierIcon = tier.icon;
              const rank = idx < 3 ? RANK_STYLES[idx] : null;
              return (
                <motion.div
                  key={voter.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="group flex items-center gap-3 rounded-lg border bg-background p-2.5 transition-colors hover:bg-accent/40"
                >
                  {/* Rank */}
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    {rank ? (
                      <span className={cn("grid h-8 w-8 place-items-center rounded-full text-base", rank.bg)}>
                        {rank.medal}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Voter info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{voter.name}</p>
                      <TierIcon className={cn("h-3 w-3 shrink-0", tier.color)} />
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {maskEmail(voter.email)} · {voter.electionName}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="hidden shrink-0 items-center gap-1 sm:flex">
                    {voter.verified && (
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 px-1 py-0 text-[9px] text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                        Verified
                      </Badge>
                    )}
                    {voter.voted && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-1 py-0 text-[9px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Vote className="mr-0.5 h-2.5 w-2.5" />
                        Voted
                      </Badge>
                    )}
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-bold tabular-nums", tier.color)}>
                      {voter.score}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{tier.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

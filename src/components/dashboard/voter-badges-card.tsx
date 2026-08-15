"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, initials, maskEmail } from "@/lib/utils";
import {
  Award,
  Vote,
  BadgeCheck,
  Zap,
  Sunrise,
  Flame,
  Crown,
  Lock,
} from "lucide-react";

interface BadgeData {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt: string | null;
}

interface VoterWithBadges {
  voterId: string;
  voterName: string;
  voterEmail: string;
  badges: BadgeData[];
  badgeCount: number;
}

interface BadgesData {
  voters: VoterWithBadges[];
  distribution: Record<string, number>;
  summary: {
    totalVoters: number;
    votersWithBadges: number;
    totalBadgesAwarded: number;
    avgBadgesPerVoter: number;
  };
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Vote,
  BadgeCheck,
  Zap,
  Sunrise,
  Flame,
  Crown,
};

const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

const ALL_BADGE_IDS = ["first_vote", "verified_citizen", "speed_voter", "early_bird", "streak_voter", "loyal_voter"];

export function VoterBadgesCard() {
  const [data, setData] = useState<BadgesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const res = await apiFetch<BadgesData>("/api/admin/voter-badges");
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.voters.length === 0) return null;

  const { voters, distribution, summary } = data;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Voter achievement badges
            </CardTitle>
            <CardDescription className="text-xs">
              Gamified recognition for voter engagement milestones
            </CardDescription>
          </div>
          <UiBadge variant="outline" className="gap-1.5">
            <Award className="h-3 w-3 text-primary" />
            {summary.totalBadgesAwarded} awarded
          </UiBadge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Badge distribution */}
        <div className="border-b bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Badge distribution
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ALL_BADGE_IDS.map((badgeId) => {
              const count = distribution[badgeId] ?? 0;
              const isEarned = count > 0;
              return (
                <div
                  key={badgeId}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
                    isEarned
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/60 bg-muted/30 opacity-50"
                  )}
                  title={isEarned ? `${count} voters earned this` : "Not yet earned"}
                >
                  <div
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full",
                      isEarned ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isEarned ? (
                      <Award className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                  </div>
                  <p className="text-[9px] font-medium capitalize">
                    {badgeId.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] font-bold tabular-nums">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voter badges leaderboard */}
        <ScrollArea className="max-h-[20rem] scroll-area-custom">
          <div className="space-y-1 p-3">
            {voters.map((voter, idx) => (
              <motion.div
                key={voter.voterId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="group flex items-center gap-3 rounded-lg border bg-background p-2.5 transition-colors hover:bg-accent/40"
              >
                <div className="flex w-7 shrink-0 items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {initials(voter.voterName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{voter.voterName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {maskEmail(voter.voterEmail)} · {voter.badgeCount} badge{voter.badgeCount === 1 ? "" : "s"}
                  </p>
                </div>
                {/* Earned badges */}
                <div className="flex shrink-0 items-center gap-1">
                  {voter.badges
                    .filter((b) => b.earned)
                    .map((badge) => {
                      const Icon = BADGE_ICONS[badge.icon] ?? Award;
                      return (
                        <div
                          key={badge.id}
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-full border",
                            BADGE_COLORS[badge.color] ?? "bg-muted text-muted-foreground border-border"
                          )}
                          title={`${badge.label}: ${badge.description}`}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

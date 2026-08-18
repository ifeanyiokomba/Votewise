"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Crown, TrendingUp, Users } from "lucide-react";

export interface CandidateResult {
  id: string;
  name: string;
  photo?: string | null;
  position?: string;
  bio?: string | null;
  voteCount?: number;
  percentage?: number;
  rank?: number;
}

interface CandidateResultsBoardProps {
  candidates: CandidateResult[];
  electionName?: string;
  showLiveResults?: boolean;
  totalVotes?: number;
  totalVoters?: number;
}

/**
 * Futuristic candidate results display with:
 * - Candidate headshots in glowing animated avatars
 * - Animated percentage bars with gradient fills
 * - Rank badges with crown for winner
 * - Real-time pulse animations
 * - Glassmorphism card design
 * - Mobile-first responsive layout
 */
export function CandidateResultsBoard({
  candidates,
  electionName,
  showLiveResults = true,
  totalVotes = 0,
  totalVoters = 0,
}: CandidateResultsBoardProps) {
  // Sort by percentage descending
  const sorted = [...candidates].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  const winner = sorted[0];
  const turnout = totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Live results header */}
      {showLiveResults && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Live Results
            </span>
            {electionName && (
              <span className="text-sm text-muted-foreground">· {electionName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {totalVotes.toLocaleString()} / {totalVoters.toLocaleString()} votes
            </span>
            <span className="flex items-center gap-1 font-medium text-primary">
              <TrendingUp className="size-3.5" />
              {turnout}% turnout
            </span>
          </div>
        </motion.div>
      )}

      {/* Candidate cards */}
      <div className="grid gap-3 sm:gap-4">
        {sorted.map((candidate, idx) => {
          const pct = candidate.percentage ?? 0;
          const isWinner = idx === 0 && pct > 0;
          const initials = candidate.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4, ease: "easeOut" }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
                isWinner
                  ? "border-amber-300/50 bg-gradient-to-r from-amber-50 via-amber-50/50 to-transparent dark:border-amber-700/50 dark:from-amber-950/30 dark:via-amber-950/10"
                  : "border-border/60 bg-card"
              )}
            >
              {/* Glow effect for winner */}
              {isWinner && (
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
              )}

              <div className="relative flex items-center gap-4">
                {/* Rank badge */}
                <div className="flex w-6 shrink-0 flex-col items-center">
                  {isWinner ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <Crown className="h-6 w-6 text-amber-500" />
                    </motion.div>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground/40">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Avatar with glow ring */}
                <div className="relative shrink-0">
                  {/* Animated glow ring */}
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full blur-md",
                      isWinner
                        ? "bg-amber-400/30"
                        : "bg-primary/20"
                    )}
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <Avatar
                    className={cn(
                      "relative h-16 w-16 border-2 sm:h-20 sm:w-20",
                      isWinner
                        ? "border-amber-400 shadow-lg shadow-amber-400/20"
                        : "border-primary/30"
                    )}
                  >
                    {candidate.photo ? (
                      <AvatarImage src={candidate.photo} alt={candidate.name} />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        "text-lg font-bold sm:text-xl",
                        isWinner
                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                          : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
                      )}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name + position */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold sm:text-base">
                      {candidate.name}
                    </h3>
                    {isWinner && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        Leading
                      </Badge>
                    )}
                  </div>
                  {candidate.position && (
                    <p className="truncate text-xs text-muted-foreground">
                      {candidate.position}
                    </p>
                  )}
                  {candidate.bio && !candidate.position && (
                    <p className="truncate text-xs text-muted-foreground">
                      {candidate.bio}
                    </p>
                  )}

                  {/* Vote count */}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {candidate.voteCount?.toLocaleString() ?? 0}
                    </span>{" "}
                    votes
                  </p>
                </div>

                {/* Percentage */}
                <div className="shrink-0 text-right">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1, type: "spring" }}
                    className={cn(
                      "text-2xl font-bold tabular-nums sm:text-3xl",
                      isWinner
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent"
                        : "text-foreground"
                    )}
                  >
                    {pct.toFixed(1)}%
                  </motion.div>
                </div>
              </div>

              {/* Animated progress bar */}
              <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    isWinner
                      ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"
                      : idx === 1
                        ? "bg-gradient-to-r from-slate-400 to-slate-500"
                        : idx === 2
                          ? "bg-gradient-to-r from-orange-400 to-orange-600"
                          : "bg-gradient-to-r from-primary to-primary/60"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: "easeOut" }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: 1,
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      {showLiveResults && (
        <p className="text-center text-[10px] text-muted-foreground">
          Results update in real-time as votes are cast · Ballot secrecy is protected
        </p>
      )}
    </div>
  );
}

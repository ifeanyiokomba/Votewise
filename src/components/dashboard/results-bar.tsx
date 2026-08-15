"use client";

import { cn, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Crown, Users } from "lucide-react";
import { initials } from "@/lib/utils";
import type { CandidateResult } from "./types";

interface ResultsBarProps {
  candidate: CandidateResult;
  totalVotes: number;
  isWinner: boolean;
  index: number;
}

export function ResultsBar({
  candidate,
  totalVotes,
  isWinner,
  index,
}: ResultsBarProps) {
  const pct = candidate.percentage;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        isWinner ? "border-primary/40 bg-primary/5" : "bg-card"
      )}
    >
      <div className="flex w-6 shrink-0 items-center justify-center">
        {isWinner ? (
          <Crown className="h-4 w-4 text-primary" />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {index + 1}
          </span>
        )}
      </div>

      <Avatar className="h-9 w-9 border">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isWinner ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          {initials(candidate.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{candidate.name}</p>
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {formatNumber(candidate.voteCount)}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={pct} className="h-1.5" />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {isWinner && (
        <span className="ml-1 hidden rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary sm:inline-flex">
          Winner
        </span>
      )}
    </div>
  );
}

interface PositionResultsListProps {
  totalVotes: number;
  candidates: CandidateResult[];
  winnerId: string | null;
  isTie: boolean;
  totalVoters: number;
}

export function PositionResultsCard({
  totalVotes,
  candidates,
  winnerId,
  isTie,
  totalVoters,
}: PositionResultsListProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {formatNumber(totalVotes)} {totalVotes === 1 ? "vote" : "votes"} cast
          </span>
          {totalVoters > 0 && (
            <span>· {formatNumber(totalVoters)} eligible</span>
          )}
        </div>
        {isTie && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Tied — no winner
          </span>
        )}
        {totalVotes === 0 && (
          <span className="italic text-muted-foreground">No votes cast yet</span>
        )}
      </div>
      <div className="grid gap-2">
        {candidates.map((c, i) => (
          <ResultsBar
            key={c.id}
            candidate={c}
            totalVotes={totalVotes}
            isWinner={!!winnerId && c.id === winnerId && !isTie}
            index={i}
          />
        ))}
        {candidates.length === 0 && (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No candidates registered for this position.
          </div>
        )}
      </div>
    </div>
  );
}

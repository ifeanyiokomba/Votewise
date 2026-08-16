"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatPercent, initials, timeUntil } from "@/lib/utils";
import {
  Users,
  Vote,
  CheckCircle2,
  Activity,
  Radio,
  Clock,
  ChevronRight,
  Eye,
  Crown,
} from "lucide-react";

interface LiveCandidate {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  manifesto: string | null;
  voteCount: number;
}

interface LivePosition {
  id: string;
  title: string;
  maxChoices: number;
  candidates: LiveCandidate[];
}

interface LiveElection {
  id: string;
  name: string;
  description: string | null;
  status: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  resultVisibility: string;
  stats: {
    voters: number;
    verified: number;
    votes: number;
    activeSessions: number;
    positions: number;
    candidates: number;
    turnout: number;
    verificationRate: number;
  };
  positions: LivePosition[];
}

export function LiveElectionCards() {
  const [elections, setElections] = useState<LiveElection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch<{ elections: LiveElection[] }>("/api/admin/live-elections");
    setLoading(false);
    if (res.success && res.data) {
      setElections(res.data.elections);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    // Auto-refresh every 10 seconds for near-live updates
    const interval = setInterval(() => {
      if (!cancelled) load();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (elections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Live elections</h2>
        <Badge variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Auto-refreshing
        </Badge>
      </div>

      {elections.map((election, idx) => (
        <LiveElectionCard key={election.id} election={election} index={idx} />
      ))}
    </div>
  );
}

function LiveElectionCard({ election, index }: { election: LiveElection; index: number }) {
  const isLive = election.status === "LIVE";
  const showResults = election.resultVisibility === "LIVE" && isLive;
  const maxVotes = Math.max(
    ...election.positions.flatMap((p) => p.candidates.map((c) => c.voteCount)),
    1
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className={cn("overflow-hidden", isLive && "border-emerald-300/40 shadow-glow")}>
        {/* Election header bar */}
        <div className={cn(
          "flex items-center justify-between gap-3 border-b p-4",
          isLive ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-muted/30"
        )}>
          <div className="flex items-center gap-3">
            <StatusBadge status={election.status} />
            <div>
              <Link href={`/dashboard/elections/${election.id}`} className="hover:underline">
                <h3 className="text-base font-semibold">{election.name}</h3>
              </Link>
              {isLive && election.endTime && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ends in {timeUntil(election.endTime)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && election.stats.activeSessions > 0 && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Activity className="h-3 w-3" />
                {election.stats.activeSessions} active
              </Badge>
            )}
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href={`/dashboard/elections/${election.id}`}>
                Monitor <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Real-time stats row */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill icon={Users} label="Voters" value={election.stats.voters} color="text-primary" />
            <StatPill icon={CheckCircle2} label="Verified" value={election.stats.verified} color="text-emerald-500" />
            <StatPill icon={Vote} label="Votes" value={election.stats.votes} color="text-chart-2" />
            <StatPill icon={Activity} label="Active" value={election.stats.activeSessions} color="text-amber-500" />
          </div>

          {/* Turnout progress bar */}
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Turnout</span>
              <span className="font-bold tabular-nums text-primary">
                {formatPercent(election.stats.turnout)}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-chart-2"
                initial={{ width: 0 }}
                animate={{ width: `${election.stats.turnout}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {formatNumber(election.stats.votes)} of {formatNumber(election.stats.voters)} voters · {formatPercent(election.stats.verificationRate)} verified
            </p>
          </div>

          {/* Candidate headshots + live results */}
          {showResults && election.positions.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                Live candidate results
              </div>
              {election.positions.slice(0, 2).map((pos) => (
                <div key={pos.id} className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold">{pos.title}</p>
                  <div className="space-y-2">
                    {pos.candidates.slice(0, 4).map((cand, i) => (
                      <CandidateResultRow
                        key={cand.id}
                        candidate={cand}
                        maxVotes={maxVotes}
                        isLeading={i === 0 && cand.voteCount > 0}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {election.positions.length > 2 && (
                <Link href={`/dashboard/elections/${election.id}/results`} className="block text-center text-xs text-primary hover:underline">
                  View all {election.positions.length} positions
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {election.resultVisibility === "PUBLISHED_ONLY"
                ? "Results are set to published-only. Enable real-time results to see live candidate tallies."
                : isLive
                  ? "Candidate results will appear when voting closes."
                  : "Results will be available when the election goes live."}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
      <Icon className={cn("h-4 w-4", color)} />
      <div>
        <p className="text-lg font-bold tabular-nums">{formatNumber(value)}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CandidateResultRow({
  candidate,
  maxVotes,
  isLeading,
}: {
  candidate: LiveCandidate;
  maxVotes: number;
  isLeading: boolean;
}) {
  const pct = maxVotes > 0 ? (candidate.voteCount / maxVotes) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8 shrink-0">
        {candidate.photo && <AvatarImage src={candidate.photo} alt="" />}
        <AvatarFallback className={cn("text-xs", isLeading ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
          {initials(candidate.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 truncate text-xs font-medium">
            {isLeading && <Crown className="h-3 w-3 text-amber-500" />}
            {candidate.name}
          </span>
          <span className="shrink-0 text-xs font-bold tabular-nums">
            {formatNumber(candidate.voteCount)}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn("h-full rounded-full", isLeading ? "bg-primary" : "bg-primary/40")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// Need Button import
import { Button } from "@/components/ui/button";

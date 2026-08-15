"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { apiFetch } from "@/lib/api-fetch";
import { Logo } from "@/components/shared/logo";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  Vote,
  Activity,
  TrendingUp,
  ShieldCheck,
  Eye,
  Trophy,
  BarChart3,
  Clock,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { cn, formatNumber, formatPercent, formatRelative, timeUntil, initials } from "@/lib/utils";
import { toast } from "sonner";

interface ObserverData {
  election: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    startTime: string | null;
    endTime: string | null;
    timezone: string;
    type: string;
    organization: { name: string; slug: string; logo: string | null };
  };
  stats: {
    voters: number;
    verified: number;
    completedVotes: number;
    activeSessions: number;
    candidates: number;
    positions: number;
    turnout: number;
    verificationRate: number;
  };
  timeline: { hour: string; count: number; total: number }[];
  results: {
    electionId: string;
    electionName: string;
    totalVotes: number;
    totalVoters: number;
    turnout: number;
    positions: {
      position: { id: string; title: string; description: string | null };
      totalVotes: number;
      candidates: {
        id: string;
        name: string;
        photo: string | null;
        voteCount: number;
        percentage: number;
        rank: number;
      }[];
      winnerId: string | null;
      isTie: boolean;
    }[];
  } | null;
}

export default function ObserverPage() {
  const params = useParams<{ id: string }>();
  const electionId = params.id;
  const reduce = useReducedMotion();

  const [data, setData] = useState<ObserverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<ObserverData>(`/api/public/observe/${electionId}`);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load election data");
    }
    setLoading(false);
  }, [electionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    // Refresh every 10 seconds for near-live updates
    const interval = setInterval(() => {
      if (!cancelled) load();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  function shareLink() {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    toast.success("Link copied", { description: "Share this observer link with stakeholders." });
  }

  if (loading && !data) {
    return <ObserverSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load election</CardTitle>
            <CardDescription>{error ?? "Please try again later."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { election, stats, timeline, results } = data;
  const isLive = election.status === "LIVE";
  const isPublished = election.status === "PUBLISHED";
  const maxTimelineCount = Math.max(...timeline.map((t) => t.count), 1);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3"
      >
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
        <Button onClick={shareLink} variant="outline" size="sm" className="gap-2">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-accent/30 to-background p-6 sm:p-8"
      >
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 translate-y-6 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={election.status} />
            {isLive && (
              <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live monitoring
              </Badge>
            )}
          </div>
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {election.name}
          </h1>
          {election.description && (
            <p className="mx-auto mt-2 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
              {election.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {election.organization.name}
            </span>
            {election.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatRelative(election.startTime)}
              </span>
            )}
            {election.endTime && isLive && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                ends in {timeUntil(election.endTime)}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Observer notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Observer view</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You are monitoring this election as an independent observer. This view shows
              aggregate turnout and verification metrics{isPublished ? " and final results" : " only"}.
              Individual voter identities and ballot choices are never exposed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <ObserverStat icon={Users} label="Registered" value={formatNumber(stats.voters)} />
        <ObserverStat icon={UserCheck} label="Verified" value={formatNumber(stats.verified)} />
        <ObserverStat icon={Vote} label="Votes cast" value={formatNumber(stats.completedVotes)} />
        <ObserverStat
          icon={Activity}
          label="Active now"
          value={formatNumber(stats.activeSessions)}
          highlight={stats.activeSessions > 0}
        />
        <ObserverStat
          icon={TrendingUp}
          label="Turnout"
          value={formatPercent(stats.turnout)}
          hint={`${stats.completedVotes}/${stats.voters}`}
        />
        <ObserverStat
          icon={ShieldCheck}
          label="Verification"
          value={formatPercent(stats.verificationRate)}
        />
      </div>

      {/* Turnout progress */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Turnout overview
          </CardTitle>
          <CardDescription>
            {isLive
              ? "Live participation rate — updates every 10 seconds."
              : isPublished
                ? "Final participation for this concluded election."
                : "Voting has not started yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Ballots cast</span>
              <span className="tabular-nums">
                {formatNumber(stats.completedVotes)} of {formatNumber(stats.voters)} voters
              </span>
            </div>
            <Progress value={stats.turnout} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Verification rate: {formatPercent(stats.verificationRate)}</span>
              <span>{formatPercent(stats.turnout)} turnout</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vote timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Vote timeline
            </CardTitle>
            <CardDescription>Ballots cast over time (cumulative).</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex h-40 items-end gap-1">
              {timeline.slice(-24).map((point) => {
                const heightPct = (point.count / maxTimelineCount) * 100;
                const totalPct = stats.completedVotes > 0 ? (point.total / stats.completedVotes) * 100 : 0;
                return (
                  <div
                    key={point.hour}
                    className="group relative flex flex-1 flex-col items-center gap-1"
                    title={`${point.hour}: ${point.count} votes (${point.total} total)`}
                  >
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-primary/20 transition-all group-hover:bg-primary/30"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-primary"
                          style={{ height: `${(totalPct / 100) * heightPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{timeline[0]?.hour.slice(11)}:00</span>
              <span>{timeline[timeline.length - 1]?.hour.slice(11)}:00</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Published results */}
      {isPublished && results && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Final results
            </CardTitle>
            <CardDescription>
              {formatNumber(results.totalVotes)} ballots · {formatPercent(results.turnout)} turnout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {results.positions.map((pos) => (
              <div key={pos.position.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{pos.position.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(pos.totalVotes)} votes
                    </p>
                  </div>
                  {pos.isTie ? (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                      Tied
                    </Badge>
                  ) : pos.winnerId ? (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Winner declared
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {pos.candidates.map((cand) => {
                    const isWinner = pos.winnerId === cand.id;
                    return (
                      <div
                        key={cand.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                          isWinner && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initials(cand.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-sm font-medium", isWinner && "text-primary")}>
                              {cand.name}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatNumber(cand.voteCount)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={cand.percentage} className="h-1.5" />
                            <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                              {formatPercent(cand.percentage)}
                            </span>
                          </div>
                        </div>
                        {isWinner && (
                          <Trophy className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trust footer */}
      <Separator />
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Tamper-evident
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <Eye className="size-3.5 text-primary" />
          Read-only observer
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <Activity className="size-3.5 text-primary" />
          Auto-refresh 10s
        </span>
      </div>

      <div className="flex justify-center">
        <Logo size="sm" />
      </div>
    </div>
  );
}

function ObserverStat({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={cn("grid h-8 w-8 place-items-center rounded-lg", highlight ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary")}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ObserverSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

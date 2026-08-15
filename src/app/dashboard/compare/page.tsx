"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Users,
  Vote,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  ArrowRight,
  Activity,
} from "lucide-react";
import { cn, formatNumber, formatPercent, formatDate } from "@/lib/utils";

interface ComparisonEntry {
  id: string;
  name: string;
  status: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  voters: number;
  votes: number;
  positions: number;
  candidates: number;
  turnout: number;
}

interface TrendPoint {
  name: string;
  turnout: number;
  voters: number;
  votes: number;
  date: string;
}

interface CompareData {
  elections: ComparisonEntry[];
  trend: TrendPoint[];
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  totals: {
    elections: number;
    totalVoters: number;
    totalVotes: number;
    avgTurnout: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  FACULTY: "Faculty",
  DEPARTMENT: "Department",
  EXECUTIVE: "Executive",
  CONFIDENCE: "Confidence",
  BALLOT_MEASURE: "Ballot Measure",
};

const STATUS_COLORS: Record<string, string> = {
  LIVE: "bg-emerald-500",
  SCHEDULED: "bg-amber-500",
  READY: "bg-teal-500",
  DRAFT: "bg-zinc-400",
  CONFIGURATION: "bg-zinc-400",
  VOTER_IMPORT: "bg-amber-400",
  CANDIDATE_SETUP: "bg-amber-400",
  VERIFICATION: "bg-sky-400",
  CLOSED: "bg-zinc-500",
  RESULTS_REVIEW: "bg-violet-400",
  PUBLISHED: "bg-primary",
  ARCHIVED: "bg-zinc-300",
};

export default function ComparePage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<CompareData>("/api/admin/compare");
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message ?? "Could not load comparison data");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (loading) return <CompareSkeleton />;
  if (error || !data) {
    return (
      <div className="flex-1 p-6">
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-sm text-destructive">
            {error ?? "Unable to load comparison data."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { elections, trend, typeDistribution, statusDistribution, totals } = data;
  const maxTurnout = Math.max(...trend.map((t) => t.turnout), 100);
  const maxVoters = Math.max(...trend.map((t) => t.voters), 1);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <PageHeader
        eyebrow="Analytics"
        title="Election Comparison"
        description="Compare turnout, participation, and engagement across all your elections."
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Elections"
          value={formatNumber(totals.elections)}
          icon={BarChart3}
          hint="All elections"
        />
        <StatCard
          label="Total Voters"
          value={formatNumber(totals.totalVoters)}
          icon={Users}
          hint="Across all elections"
        />
        <StatCard
          label="Total Votes"
          value={formatNumber(totals.totalVotes)}
          icon={Vote}
          hint="All-time ballots"
        />
        <StatCard
          label="Average Turnout"
          value={formatPercent(totals.avgTurnout)}
          icon={TrendingUp}
          hint="Across elections with voters"
        />
      </div>

      {/* Turnout trend chart */}
      {trend.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Turnout trend
            </CardTitle>
            <CardDescription>
              Voter participation across elections over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex h-64 items-end gap-3">
              {trend.map((point, idx) => {
                const heightPct = (point.turnout / maxTurnout) * 100;
                const voterWidth = (point.voters / maxVoters) * 100;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    className="group relative flex flex-1 flex-col items-center gap-2"
                  >
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-20 z-10 hidden flex-col items-center rounded-lg border bg-popover p-2 text-xs shadow-md group-hover:flex">
                      <span className="font-medium">{point.name}</span>
                      <span className="text-muted-foreground">
                        {formatPercent(point.turnout)} turnout
                      </span>
                      <span className="text-muted-foreground">
                        {formatNumber(point.votes)} / {formatNumber(point.voters)} voters
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="flex w-full max-w-[80px] flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all group-hover:from-primary group-hover:to-primary"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div
                          className="w-full rounded-t-lg bg-primary/30"
                          style={{ height: `${voterWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Label */}
                    <div className="text-center">
                      <p className="max-w-[80px] truncate text-[10px] font-medium">
                        {point.name}
                      </p>
                      <p className="text-xs font-bold tabular-nums text-primary">
                        {formatPercent(point.turnout)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Type distribution */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Election types
            </CardTitle>
            <CardDescription>Distribution by election type</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {Object.keys(typeDistribution).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No elections yet.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(typeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const pct = (count / totals.elections) * 100;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {TYPE_LABELS[type] ?? type}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {count} ({formatPercent(pct, 0)})
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Status breakdown
            </CardTitle>
            <CardDescription>Current lifecycle stages</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {Object.keys(statusDistribution).length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No elections yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(statusDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-full",
                          STATUS_COLORS[status] ?? "bg-zinc-400"
                        )}
                      />
                      <span className="flex-1 text-sm">
                        {status.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <Badge variant="outline" className="tabular-nums">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed comparison table */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Detailed comparison
          </CardTitle>
          <CardDescription>
            Side-by-side metrics for every election in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {elections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No elections to compare yet.
            </p>
          ) : (
            <ScrollArea className="scroll-area-custom">
              <div className="min-w-[800px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Election</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Voters</th>
                      <th className="px-4 py-3 text-right font-medium">Votes</th>
                      <th className="px-4 py-3 text-right font-medium">Positions</th>
                      <th className="px-4 py-3 text-right font-medium">Candidates</th>
                      <th className="px-4 py-3 font-medium" style={{ width: "140px" }}>
                        Turnout
                      </th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map((el, idx) => (
                      <motion.tr
                        key={el.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group border-b transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/elections/${el.id}`}
                            className="font-medium hover:underline"
                          >
                            {el.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                            {TYPE_LABELS[el.type] ?? el.type}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={el.status} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(el.voters)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(el.votes)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {el.positions}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {el.candidates}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={el.turnout} className="h-1.5" />
                            <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                              {formatPercent(el.turnout, 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {el.startTime ? formatDate(el.startTime) : "Not scheduled"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/elections/${el.id}`}
                            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

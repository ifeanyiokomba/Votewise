"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ElectionCardSkeleton,
  StatCardSkeleton,
  ErrorState,
  EmptyState,
} from "@/components/dashboard/dashboard-skeleton";
import { ElectionCard } from "@/components/dashboard/election-card";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { EngagementLeaderboard } from "@/components/dashboard/engagement-leaderboard";
import { EngagementScoringCard } from "@/components/dashboard/engagement-scoring-card";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatRelative, formatPercent } from "@/lib/utils";
import {
  Vote,
  Users,
  UserSquare2,
  ClipboardCheck,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
  Plus,
  Upload,
  BarChart3,
  Activity,
  ScrollText,
  CalendarClock,
} from "lucide-react";
import type {
  AdminStatsResponse,
  ElectionDTO,
  MeResponse,
  AuditLogDTO,
} from "@/components/dashboard/types";

const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  ELECTION_CREATE: "Created election",
  ELECTION_UPDATE: "Updated election",
  ELECTION_ACTIVATE: "Went live",
  ELECTION_PAUSE: "Paused election",
  ELECTION_CLOSE: "Closed election",
  ELECTION_PUBLISH: "Published results",
  ELECTION_PUBLISHED: "Published results",
  ELECTION_ARCHIVE: "Archived election",
  CANDIDATE_CREATE: "Added candidate",
  CANDIDATE_UPDATE: "Updated candidate",
  CANDIDATE_DELETE: "Removed candidate",
  VOTER_IMPORT: "Imported voters",
  VOTER_UPDATE: "Updated voter",
  VOTER_DELETE: "Removed voter",
  VOTE_CAST: "Vote cast",
  RESULT_PUBLISHED: "Published results",
  ROLE_CHANGE: "Changed user role",
  SETTINGS_CHANGE: "Updated settings",
  PAYMENT_RECEIVED: "Payment received",
  SUBSCRIPTION_CHANGE: "Changed subscription",
  SUPPORT_TICKET_CREATE: "Opened ticket",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  AUTH_FAILURE: "Auth failed",
  USER_REGISTERED: "User registered",
  PASSWORD_RESET: "Reset password",
};

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [elections, setElections] = useState<ElectionDTO[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, electionsRes, meRes] = await Promise.all([
      apiFetch<AdminStatsResponse>("/api/admin/stats"),
      apiFetch<{ elections: ElectionDTO[] }>("/api/elections"),
      apiFetch<MeResponse>("/api/auth/me"),
    ]);
    setLoading(false);
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    } else {
      setError(statsRes.error?.message ?? "Could not load dashboard stats");
    }
    if (electionsRes.success && electionsRes.data) {
      setElections(electionsRes.data.elections);
    }
    if (meRes.success && meRes.data) {
      setMe(meRes.data);
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

  const firstName = me?.user?.name?.split(" ")[0] ?? "there";
  const orgName = me?.organization?.name ?? "your organization";
  const tier = me?.organization?.subscriptionTier ?? "FREE";

  const activeElections = elections.filter((e) =>
    ["LIVE", "SCHEDULED", "READY"].includes(e.status)
  );
  const recentAudit: AuditLogDTO[] = stats?.recentAudit ?? [];

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Greeting — gradient accent panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/40 to-background p-6 sm:p-8"
      >
        <div className="absolute right-0 top-0 h-40 w-40 -translate-y-12 translate-x-12 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 translate-y-8 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {orgName}
              </p>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems operational
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening across your elections today.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary backdrop-blur-sm">
            {TIER_LABELS[tier] ?? tier} plan
          </Badge>
        </div>
      </motion.div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Active Elections"
            value={formatNumber(stats.orgStats.activeElections)}
            icon={Vote}
            hint="LIVE + scheduled"
          />
          <StatCard
            label="Total Voters"
            value={formatNumber(stats.orgStats.voters)}
            icon={Users}
            hint="Across all elections"
          />
          <StatCard
            label="Candidates"
            value={formatNumber(stats.orgStats.candidates)}
            icon={UserSquare2}
          />
          <StatCard
            label="Votes Cast"
            value={formatNumber(stats.orgStats.totalVotes)}
            icon={ClipboardCheck}
            hint="All-time"
          />
          <StatCard
            label="Pending Tickets"
            value={formatNumber(stats.orgStats.pendingTickets)}
            icon={LifeBuoy}
            hint="Open support tickets"
          />
          <StatCard
            label="Security Alerts"
            value={formatNumber(stats.stats.unresolved)}
            icon={ShieldAlert}
            hint={`${stats.stats.critical} critical`}
            trend={
              stats.stats.unresolved > 0
                ? { value: "needs attention", positive: false }
                : { value: "all clear", positive: true }
            }
          />
        </div>
      ) : null}

      {/* Quick actions */}
      {!loading && !error && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Common tasks to keep your elections moving.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/dashboard/elections"
              icon={Plus}
              title="Create election"
              description="Start a new vote"
            />
            <QuickAction
              href="/dashboard/elections"
              icon={Upload}
              title="Import voters"
              description="Upload CSV / XLSX"
            />
            <QuickAction
              href="/dashboard/elections"
              icon={BarChart3}
              title="View results"
              description="See live tallies"
            />
            <QuickAction
              href="/dashboard/support"
              icon={LifeBuoy}
              title="Contact support"
              description="We respond fast"
            />
          </CardContent>
        </Card>
      )}

      {/* Active elections + side panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Active elections</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/elections">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <ElectionCardSkeleton key={i} />
              ))}
            </div>
          ) : activeElections.length === 0 ? (
            <EmptyState
              title="No active elections"
              description="Create an election to get it ready for voting. You can import voters and add candidates next."
              icon={Vote}
              action={
                <Button asChild>
                  <Link href="/dashboard/elections">
                    <Plus className="h-4 w-4" /> Create election
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeElections.map((el, i) => (
                <ElectionCard key={el.id} election={el} index={i} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {/* Election health */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Election health
              </CardTitle>
              <CardDescription>Turnout across active elections.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {activeElections.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No active elections to monitor yet.
                </p>
              ) : (
                <ScrollArea className="max-h-72 scroll-area-custom">
                  <ul className="space-y-3 pr-2">
                    {activeElections.map((el) => {
                      const voters = el._count?.voters ?? 0;
                      const votes = el._count?.votes ?? 0;
                      const pct = voters > 0 ? Math.round((votes / voters) * 100) : 0;
                      return (
                        <li key={el.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/dashboard/elections/${el.id}`}
                              className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                            >
                              {el.name}
                            </Link>
                            <StatusBadge status={el.status} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5" />
                            <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatNumber(votes)} of {formatNumber(voters)} voters
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Live activity feed (real-time via socket.io) */}
          {me?.organization?.id && (
            <LiveActivityFeed organizationId={me.organization.id} />
          )}

          {/* Recent audit (static fallback) */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4 text-primary" />
                Recent audit
              </CardTitle>
              <CardDescription>Audit trail from the last actions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {recentAudit.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No recent activity recorded.
                </p>
              ) : (
                <ScrollArea className="max-h-72 scroll-area-custom">
                  <ol className="space-y-3 pr-2">
                    {recentAudit.slice(0, 6).map((log) => (
                      <li key={log.id} className="flex gap-3">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {AUDIT_ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ").toLowerCase()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {log.resource}
                            {log.result && log.result !== "SUCCESS"
                              ? ` · ${log.result.toLowerCase()}`
                              : ""}{" "}
                            · {formatRelative(log.timestamp)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Engagement analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementLeaderboard />
        <EngagementScoringCard />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:bg-accent"
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

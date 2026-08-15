"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/shared/stat-card";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { VoteTimeline } from "@/components/dashboard/vote-timeline";
import { DemographicsPanel, type DemographicsData } from "@/components/dashboard/demographics-panel";
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import {
  Users,
  UserCheck,
  Vote,
  Activity,
  TrendingUp,
  ShieldCheck,
  ScrollText,
  CalendarClock,
  CalendarRange,
  Clock,
} from "lucide-react";
import { formatNumber, formatPercent, formatRelative, timeUntil } from "@/lib/utils";
import type {
  ElectionStats,
  TimelinePoint,
  AuditLogDTO,
  ElectionDTO,
} from "@/components/dashboard/types";

const AUDIT_LABELS: Record<string, string> = {
  ELECTION_CREATE: "Created election",
  ELECTION_UPDATE: "Updated election",
  ELECTION_ACTIVATE: "Went live",
  ELECTION_PAUSE: "Paused election",
  ELECTION_CLOSE: "Closed election",
  ELECTION_PUBLISH: "Published results",
  ELECTION_ARCHIVE: "Archived election",
  CANDIDATE_CREATE: "Added candidate",
  CANDIDATE_UPDATE: "Updated candidate",
  CANDIDATE_DELETE: "Removed candidate",
  VOTER_IMPORT: "Imported voters",
  VOTER_UPDATE: "Updated voter",
  VOTE_CAST: "Vote cast",
  RESULT_PUBLISHED: "Published results",
  PAYMENT_RECEIVED: "Payment received",
  ROLE_CHANGE: "Changed role",
  SETTINGS_CHANGE: "Updated settings",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
};

interface AnalyticsResponse {
  stats: ElectionStats;
  timeline: TimelinePoint[];
  results: unknown;
  demographics: DemographicsData;
}

interface AuditResponse {
  logs: AuditLogDTO[];
}

interface ElectionResponse {
  election: ElectionDTO | null;
}

export default function ElectionOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [election, setElection] = useState<ElectionDTO | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [audit, setAudit] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setElectionId(id);
    })();
  }, [params]);

  const load = useCallback(async () => {
    if (!electionId) return;
    setLoading(true);
    setError(null);
    const [analyticsRes, auditRes, elRes] = await Promise.all([
      apiFetch<AnalyticsResponse>(`/api/elections/${electionId}/analytics`),
      apiFetch<AuditResponse>(`/api/elections/${electionId}/audit`),
      apiFetch<ElectionResponse>(`/api/elections/${electionId}`),
    ]);
    setLoading(false);
    if (analyticsRes.success && analyticsRes.data) {
      setAnalytics(analyticsRes.data);
    } else {
      setError(analyticsRes.error?.message ?? "Could not load analytics");
    }
    if (auditRes.success && auditRes.data) {
      setAudit(auditRes.data.logs);
    }
    if (elRes.success && elRes.data?.election) {
      setElection(elRes.data.election);
    }
  }, [electionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  if (!electionId) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <ElectionShell
      electionId={electionId}
      activeTab="overview"
      refreshKey={refreshKey}
    >
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !analytics ? (
        <OverviewSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Countdown strip */}
          {election && (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:gap-6">
                <CountdownPill
                  icon={CalendarClock}
                  label="Start"
                  value={
                    election.startTime
                      ? formatRelative(election.startTime)
                      : "Not scheduled"
                  }
                  hint={
                    election.startTime
                      ? timeUntil(election.startTime)
                      : "Set a start time"
                  }
                />
                <CountdownPill
                  icon={CalendarRange}
                  label="End"
                  value={
                    election.endTime
                      ? formatRelative(election.endTime)
                      : "Open-ended"
                  }
                  hint={
                    election.endTime ? timeUntil(election.endTime) : "Open-ended"
                  }
                />
                <CountdownPill
                  icon={Clock}
                  label="Timezone"
                  value={election.timezone}
                  hint="Local election time"
                />
                <div className="ml-auto">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {analytics.stats.status === "LIVE"
                      ? "Voting live now"
                      : analytics.stats.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Registered"
              value={formatNumber(analytics.stats.voters)}
              icon={Users}
              hint="Eligible voters"
            />
            <StatCard
              label="Verified"
              value={formatNumber(analytics.stats.verified)}
              icon={UserCheck}
              hint="OTP confirmed"
            />
            <StatCard
              label="Votes cast"
              value={formatNumber(analytics.stats.completedVotes)}
              icon={Vote}
              hint="Ballots submitted"
            />
            <StatCard
              label="Active sessions"
              value={formatNumber(analytics.stats.activeSessions)}
              icon={Activity}
              hint="Voting right now"
            />
            <StatCard
              label="Turnout"
              value={formatPercent(analytics.stats.turnout)}
              icon={TrendingUp}
              hint="Votes / voters"
              trend={
                analytics.stats.turnout >= 50
                  ? { value: "healthy", positive: true }
                  : analytics.stats.turnout > 0
                  ? { value: "low" }
                  : undefined
              }
            />
            <StatCard
              label="Verification"
              value={formatPercent(analytics.stats.verificationRate)}
              icon={ShieldCheck}
              hint="Verified / voters"
            />
          </div>

          {/* Vote timeline + Recent audit */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Vote timeline
                </CardTitle>
                <CardDescription>Ballots cast per hour bucket.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <VoteTimeline timeline={analytics.timeline ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScrollText className="h-4 w-4 text-primary" />
                  Audit log
                </CardTitle>
                <CardDescription>Recent events for this election.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {audit.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No activity recorded yet.
                  </p>
                ) : (
                  <ScrollArea className="max-h-80 scroll-area-custom">
                    <ol className="space-y-3 pr-2">
                      {audit.slice(0, 10).map((log) => (
                        <li key={log.id} className="flex gap-3">
                          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {AUDIT_LABELS[log.action] ??
                                log.action.replace(/_/g, " ").toLowerCase()}
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
          </div>

          {/* Demographics */}
          {analytics.demographics && (
            <DemographicsPanel demographics={analytics.demographics} />
          )}
        </div>
      )}
    </ElectionShell>
  );
}

function CountdownPill({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import {
  ScrollText,
  Search,
  Download,
  Info,
  Loader2,
  Filter,
} from "lucide-react";
import type {
  AdminStatsResponse,
  AuditLogDTO,
  ElectionDTO,
} from "@/components/dashboard/types";

const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  AUTH_FAILURE: "Auth failed",
  USER_REGISTERED: "User registered",
  PASSWORD_RESET: "Reset password",
  ELECTION_CREATE: "Created election",
  ELECTION_UPDATE: "Updated election",
  ELECTION_ACTIVATE: "Went live",
  ELECTION_PAUSE: "Paused election",
  ELECTION_CLOSE: "Closed election",
  ELECTION_PUBLISHED: "Published results",
  ELECTION_PUBLISH: "Published results",
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
};

function humanizeAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

const RESULT_TONE: Record<string, string> = {
  SUCCESS: "text-emerald-600 dark:text-emerald-400",
  FAILED: "text-destructive",
  ERROR: "text-destructive",
  CANCELLED: "text-amber-600 dark:text-amber-400",
};

interface ElectionAuditResponse {
  logs: AuditLogDTO[];
}

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLogDTO[]>([]);
  const [electionLogs, setElectionLogs] = useState<AuditLogDTO[] | null>(null);
  const [elections, setElections] = useState<ElectionDTO[]>([]);
  const [selectedElection, setSelectedElection] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loadingElection, setLoadingElection] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, elRes] = await Promise.all([
      apiFetch<AdminStatsResponse>("/api/admin/stats"),
      apiFetch<{ elections: ElectionDTO[] }>("/api/elections"),
    ]);
    setLoading(false);
    if (statsRes.success && statsRes.data) {
      setRecentAudit(statsRes.data.recentAudit);
    } else {
      setError(statsRes.error?.message ?? "Could not load audit log");
    }
    if (elRes.success && elRes.data) {
      setElections(elRes.data.elections);
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

  // Load full audit for selected election.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selectedElection === "all") {
        setElectionLogs(null);
        return;
      }
      setLoadingElection(true);
      const res = await apiFetch<ElectionAuditResponse>(
        `/api/elections/${selectedElection}/audit`
      );
      if (cancelled) return;
      setLoadingElection(false);
      if (res.success && res.data) {
        setElectionLogs(res.data.logs);
      } else {
        setElectionLogs([]);
        toast.error("Could not load election audit", {
          description: res.error?.message,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedElection]);

  // Combine: when an election is selected show its full audit (last 100),
  // otherwise fall back to the org's recent audit (last 8 from /admin/stats).
  const baseLogs = electionLogs ?? recentAudit;

  const allActions = useMemo(() => {
    const set = new Set<string>();
    for (const l of baseLogs) set.add(l.action);
    return Array.from(set).sort();
  }, [baseLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTime = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return baseLogs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (resultFilter !== "all" && (l.result ?? "none") !== resultFilter) return false;
      const logTime = new Date(l.timestamp).getTime();
      if (fromTime !== null && logTime < fromTime) return false;
      if (toTime !== null && logTime > toTime) return false;
      if (!q) return true;
      const haystack = [
        l.action,
        l.resource,
        l.resourceId ?? "",
        l.result ?? "",
        l.actor?.name ?? "",
        l.actor?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [baseLogs, actionFilter, resultFilter, search, dateFrom, dateTo]);

  const activeFilterCount =
    (actionFilter !== "all" ? 1 : 0) +
    (resultFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (search ? 1 : 0);

  function clearFilters() {
    setActionFilter("all");
    setResultFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const header = [
      "timestamp",
      "action",
      "actor",
      "resource",
      "resourceId",
      "result",
      "ipAddress",
    ];
    const rows = filtered.map((l) =>
      [
        l.timestamp,
        l.action,
        l.actor?.name ?? "",
        l.resource,
        l.resourceId ?? "",
        l.result ?? "",
        (l as AuditLogDTO & { ipAddress?: string | null }).ipAddress ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votewise-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} log entries`);
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Audit"
        title="Audit log explorer"
        description="An immutable trail of every meaningful action taken across your organization."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Scope explainer */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Showing {selectedElection === "all" ? (
            <>the most recent {recentAudit.length} org-wide events.</>
          ) : (
            <>the last 100 events for the selected election.</>
          )}{" "}
          Use the election selector to scope the view, or filter by action type.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, resource, result…"
                className="pl-9"
              />
            </div>
            <Select value={selectedElection} onValueChange={setSelectedElection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All elections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All elections (org)</SelectItem>
                {elections.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={actionFilter}
              onValueChange={setActionFilter}
              disabled={allActions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {allActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {humanizeAction(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="none">No result</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-[140px] text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-[140px] text-xs"
              />
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs">
                <span className="text-muted-foreground">Clear filters ({activeFilterCount})</span>
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Badge variant="outline" className="gap-1.5">
                  <Filter className="h-3 w-3" />
                  {filtered.length} match{filtered.length === 1 ? "" : "es"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loadingElection ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading election audit…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="No audit entries match"
              description="Try adjusting your filters or selecting a different election."
              icon={ScrollText}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setActionFilter("all");
                    setSelectedElection("all");
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="scroll-area-custom max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Timestamp</TableHead>
                  <TableHead className="min-w-[140px]">Actor</TableHead>
                  <TableHead className="min-w-[180px]">Action</TableHead>
                  <TableHead className="hidden min-w-[140px] md:table-cell">
                    Resource
                  </TableHead>
                  <TableHead className="hidden min-w-[100px] lg:table-cell">
                    Result
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] xl:table-cell">
                    IP
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l, i) => {
                  const ip =
                    (l as AuditLogDTO & { ipAddress?: string | null })
                      .ipAddress ?? null;
                  return (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.2) }}
                      className="border-b last:border-0 hover:bg-accent/40"
                    >
                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatDate(l.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelative(l.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {l.actor ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {l.actor.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {l.actor.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium capitalize">
                          {humanizeAction(l.action)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {l.action}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm capitalize">{l.resource}</span>
                        {l.resourceId && (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {l.resourceId.slice(-8)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {l.result ? (
                          <span
                            className={cn(
                              "text-xs font-medium capitalize",
                              RESULT_TONE[l.result] ?? "text-muted-foreground"
                            )}
                          >
                            {l.result.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                        {ip ?? "—"}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

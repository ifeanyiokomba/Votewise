"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  ColoredBadge,
  SECURITY_SEVERITY_TONE,
} from "@/components/dashboard/colored-badge";
import {
  EmptyState,
  ErrorState,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Globe,
} from "lucide-react";
import type { AdminStatsResponse } from "@/components/dashboard/types";

interface SecurityEventDTO {
  id: string;
  type: string;
  severity: string;
  organizationId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  FAILED_LOGIN: "Failed login",
  BRUTE_FORCE_DETECTED: "Brute-force detected",
  CROSS_TENANT_ACCESS: "Cross-tenant access",
  DUPLICATE_VOTE_ATTEMPT: "Duplicate vote attempt",
  UNUSUAL_IP_ACTIVITY: "Unusual IP activity",
  API_ABUSE: "API abuse",
  ADMIN_PRIVILEGE_ESCALATION: "Privilege escalation",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  SUSPICIOUS_OTP_ACTIVITY: "Suspicious OTP activity",
  SESSION_HIJACK_ATTEMPT: "Session hijack attempt",
};

function humanizeType(t: string): string {
  return EVENT_TYPE_LABELS[t] ?? t.replace(/_/g, " ").toLowerCase();
}

type SeverityFilter = "all" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ResolvedFilter = "all" | "unresolved" | "resolved";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SecurityEventDTO[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    unresolved: number;
    critical: number;
  } | null>(null);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [resolved, setResolved] = useState<ResolvedFilter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [eventsRes, statsRes] = await Promise.all([
      apiFetch<{ events: SecurityEventDTO[] }>("/api/admin/security"),
      apiFetch<AdminStatsResponse>("/api/admin/stats"),
    ]);
    setLoading(false);
    if (eventsRes.success && eventsRes.data) {
      setEvents(eventsRes.data.events);
    } else {
      setError(eventsRes.error?.message ?? "Could not load security events");
    }
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data.stats);
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

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (severity !== "all" && e.severity !== severity) return false;
      if (resolved === "unresolved" && e.resolved) return false;
      if (resolved === "resolved" && !e.resolved) return false;
      return true;
    });
  }, [events, severity, resolved]);

  async function toggleResolve(ev: SecurityEventDTO) {
    if (ev.resolved) return; // backend only toggles to resolved.
    setTogglingId(ev.id);
    const res = await apiFetch<{ event: SecurityEventDTO }>(
      `/api/admin/security`,
      {
        method: "PATCH",
        body: JSON.stringify({ id: ev.id }),
      }
    );
    setTogglingId(null);
    if (!res.success) {
      toast.error("Could not resolve event", { description: res.error?.message });
      return;
    }
    setEvents((prev) =>
      prev.map((x) =>
        x.id === ev.id
          ? { ...x, resolved: true, resolvedAt: new Date().toISOString() }
          : x
      )
    );
    setStats((prev) =>
      prev
        ? {
            ...prev,
            unresolved: Math.max(0, prev.unresolved - 1),
          }
        : prev
    );
    toast.success("Marked as resolved");
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Security"
        title="Security events"
        description="Suspicious activity, failed authentications, and other signals detected across your organization."
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total events"
            value={stats.total}
            icon={ShieldCheck}
            hint="All-time recorded events"
          />
          <StatCard
            label="Unresolved"
            value={stats.unresolved}
            icon={AlertTriangle}
            hint={stats.unresolved > 0 ? "Needs attention" : "All clear"}
            trend={
              stats.unresolved > 0
                ? { value: "needs attention", positive: false }
                : { value: "all clear", positive: true }
            }
          />
          <StatCard
            label="Critical"
            value={stats.critical}
            icon={ShieldAlert}
            hint="Severity = CRITICAL"
          />
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Severity
            </label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              State
            </label>
            <Select value={resolved} onValueChange={(v) => setResolved(v as ResolvedFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="unresolved">Unresolved only</SelectItem>
                <SelectItem value="resolved">Resolved only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="No security events"
              description={
                events.length === 0
                  ? "No suspicious activity has been detected for your organization. We'll keep monitoring."
                  : "No events match the current filters. Try widening your search."
              }
              icon={ShieldCheck}
              action={
                events.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSeverity("all");
                      setResolved("all");
                    }}
                  >
                    Reset filters
                  </Button>
                ) : undefined
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
                  <TableHead className="min-w-[140px]">Severity</TableHead>
                  <TableHead className="min-w-[180px]">Type</TableHead>
                  <TableHead className="hidden min-w-[140px] md:table-cell">
                    Detected
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] lg:table-cell">
                    IP address
                  </TableHead>
                  <TableHead className="text-right">Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-b last:border-0 hover:bg-accent/40"
                  >
                    <TableCell>
                      <ColoredBadge
                        value={e.severity}
                        tone={SECURITY_SEVERITY_TONE[e.severity] ?? "neutral"}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {humanizeType(e.type)}
                      </p>
                      {e.details && (
                        <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                          {e.details}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground md:hidden">
                        {formatRelative(e.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatRelative(e.createdAt)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {e.ipAddress ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          {e.ipAddress}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {e.resolved && (
                          <span className="text-xs text-muted-foreground">
                            {e.resolvedAt ? formatRelative(e.resolvedAt) : "resolved"}
                          </span>
                        )}
                        <Switch
                          checked={e.resolved}
                          onCheckedChange={() => toggleResolve(e)}
                          disabled={e.resolved || togglingId === e.id}
                          aria-label={`Mark ${humanizeType(e.type)} as resolved`}
                        />
                        {togglingId === e.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <p className={cn("text-xs text-muted-foreground")}>
        Resolved events cannot be re-opened from this view. To escalate a
        false-positive, contact your platform administrator.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatRelative, formatCurrency } from "@/lib/utils";
import { ProviderManagementPanel } from "@/components/dashboard/provider-management-panel";
import { AdminChatDashboard } from "@/components/dashboard/admin-chat-dashboard";
import {
  Building2,
  Vote,
  Users,
  UserSquare2,
  ShieldAlert,
  LifeBuoy,
  MessageCircle,
  Settings2,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
  Activity,
  Globe,
} from "lucide-react";

interface PlatformStats {
  organizations: number;
  elections: number;
  activeElections: number;
  voters: number;
  candidates: number;
  totalVotes: number;
  pendingNegotiations: number;
  pendingPayments: number;
  openTickets: number;
  securityEvents: number;
  completedPayments: number;
}

interface RecentOrg {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  createdAt: string;
  _count: { elections: number; voters: number };
}

interface RecentElection {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt: string;
  organization: { name: string };
  _count: { voters: number; votes: number };
}

interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
  activation: {
    election: { name: string; organization: { name: string } };
  };
}

interface PlatformData {
  stats: PlatformStats;
  recentOrgs: RecentOrg[];
  recentElections: RecentElection[];
  recentPayments: RecentPayment[];
}

export function PlatformAdminDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const res = await apiFetch<PlatformData>("/api/admin/platform-stats");
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setData(res.data);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const { stats, recentOrgs, recentElections, recentPayments } = data;
  const firstName = userName.split(" ")[0] ?? "Admin";

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/30 to-background p-6 sm:p-8"
      >
        <div className="absolute right-0 top-0 h-40 w-40 -translate-y-12 translate-x-12 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Globe className="mr-1 h-3 w-3" />
              Platform Operations
            </Badge>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform-wide overview of organizations, elections, and system health.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard label="Organizations" value={formatNumber(stats.organizations)} icon={Building2} hint="Registered orgs" />
        <StatCard label="Active Elections" value={formatNumber(stats.activeElections)} icon={Vote} hint="Currently live" trend={stats.activeElections > 0 ? { value: "live now", positive: true } : undefined} />
        <StatCard label="Total Voters" value={formatNumber(stats.voters)} icon={Users} hint="Across all orgs" />
        <StatCard label="Total Votes" value={formatNumber(stats.totalVotes)} icon={TrendingUp} hint="All-time ballots" />
      </div>

      {/* Action items */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Negotiations" value={formatNumber(stats.pendingNegotiations)} icon={DollarSign} hint="Awaiting review" />
        <StatCard label="Pending Payments" value={formatNumber(stats.pendingPayments)} icon={Clock} hint="Payment required" />
        <StatCard label="Open Tickets" value={formatNumber(stats.openTickets)} icon={LifeBuoy} hint="Support requests" />
        <StatCard label="Security Alerts" value={formatNumber(stats.securityEvents)} icon={ShieldAlert} hint="Unresolved events" />
      </div>

      {/* Recent activity + Payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent organizations */}
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Recent organizations
                </CardTitle>
                <CardDescription className="text-xs">Newest organizations on the platform</CardDescription>
              </div>
              <Link href="/dashboard/commercial" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[24rem] scroll-area-custom">
              <div className="space-y-1 p-3">
                {recentOrgs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No organizations yet.</p>
                ) : (
                  recentOrgs.map((org, idx) => (
                    <motion.div
                      key={org.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{org.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{org.slug} · {org._count.elections} elections · {org._count.voters} voters
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {org.subscriptionTier}
                      </Badge>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent elections */}
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Vote className="h-4 w-4 text-primary" />
                  Recent elections
                </CardTitle>
                <CardDescription className="text-xs">Latest elections across all organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[24rem] scroll-area-custom">
              <div className="space-y-1 p-3">
                {recentElections.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No elections yet.</p>
                ) : (
                  recentElections.map((el, idx) => (
                    <motion.div
                      key={el.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{el.name}</p>
                          <StatusBadge status={el.status} className="shrink-0 scale-90" />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {el.organization.name} · {el._count.voters} voters · {el._count.votes} votes
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelative(el.createdAt)}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Recent payments
            </CardTitle>
            <CardDescription className="text-xs">Latest election activation payments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[16rem] scroll-area-custom">
              <div className="space-y-1 p-3">
                {recentPayments.map((payment, idx) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {payment.activation.election.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payment.activation.election.organization.name} · {payment.reference}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          payment.status === "COMPLETED"
                            ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                            : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ─── Support Chat Dashboard ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Live Support Inbox</h2>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Real-time
          </Badge>
        </div>
        <AdminChatDashboard adminId={userName} adminName={userName} />
      </div>

      {/* ─── Provider Management ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Provider Configuration</h2>
        </div>
        <ProviderManagementPanel />
      </div>
    </div>
  );
}

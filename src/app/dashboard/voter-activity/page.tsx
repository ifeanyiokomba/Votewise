"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import {
  Activity,
  Users,
  CheckCircle2,
  Vote,
  Mail,
  Smartphone,
  MessageSquare,
  ChevronDown,
  ShieldCheck,
  Loader2,
  Search,
  EyeOff,
} from "lucide-react";

interface VoterActivity {
  voterId: string;
  name: string;
  email: string | null;
  phone: string | null;
  uniqueIdentifier: string;
  isEligible: boolean;
  election: { id: string; name: string; status: string };
  status: "REGISTERED" | "VERIFIED" | "VOTED";
  verifiedAt: string | null;
  verifiedChannel: string | null;
  votedAt: string | null;
  voteDuration: number | null;
}

interface ActivityResponse {
  activities: VoterActivity[];
  summary: {
    total: number;
    registered: number;
    verified: number;
    voted: number;
  };
}

interface ElectionOption {
  id: string;
  name: string;
  status: string;
}

export default function VoterActivityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<VoterActivity[]>([]);
  const [summary, setSummary] = useState({ total: 0, registered: 0, verified: 0, voted: 0 });
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [selectedElection, setSelectedElection] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const electionsRes = await apiFetch<{ elections: ElectionOption[] }>("/api/elections");
    if (electionsRes.success && electionsRes.data) {
      setElections(electionsRes.data.elections);
    }

    const url = selectedElection === "all"
      ? "/api/admin/voter-activity"
      : `/api/admin/voter-activity?electionId=${selectedElection}`;
    const res = await apiFetch<ActivityResponse>(url);
    setLoading(false);

    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load voter activity");
      return;
    }
    setActivities(res.data.activities);
    setSummary(res.data.summary);
  }, [selectedElection]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = false; };
  }, [load]);

  async function resendOtp(voter: VoterActivity, channel: "EMAIL" | "SMS" | "WHATSAPP") {
    setResendingId(voter.voterId);
    const res = await apiFetch("/api/admin/voters/resend-otp", {
      method: "POST",
      body: JSON.stringify({
        voterId: voter.voterId,
        electionId: voter.election.id,
        channel,
      }),
    });
    setResendingId(null);
    if (!res.success) {
      toast.error("Could not resend OTP", { description: res.error?.message });
      return;
    }
    const channelLabel = channel === "EMAIL" ? "email" : channel === "SMS" ? "SMS" : "WhatsApp";
    toast.success(`OTP sent via ${channelLabel}`, {
      description: `Delivered to ${voter.name}.`,
    });
  }

  const filtered = activities.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.email?.toLowerCase().includes(q) ?? false) ||
        a.uniqueIdentifier.toLowerCase().includes(q) ||
        (a.phone?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Shared · Admin & Members"
        title="Voter Activity"
        description="Track every voter's journey from registration to ballot cast. Ballot choices are never shown — secrecy is preserved."
      />

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <EyeOff className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Ballot secrecy protected</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This shared interface is available to all org admins and members. You can see when a voter
              verified and when they voted — but never which candidate they chose. Resend OTP to help
              voters who are stuck on verification.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total voters" value={summary.total} icon={Users} />
          <StatCard label="Registered" value={summary.registered} icon={Activity} />
          <StatCard label="Verified" value={summary.verified} icon={CheckCircle2} />
          <StatCard label="Voted" value={summary.voted} icon={Vote} />
        </div>
      )}

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Election</label>
            <Select value={selectedElection} onValueChange={setSelectedElection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All elections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All elections</SelectItem>
                {elections.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="VOTED">Voted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, ID, phone…"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="No voter activity yet"
              description="Once voters register or verify, their activity will appear here. Try adjusting your filters."
              icon={Activity}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {filtered.length} voter{filtered.length === 1 ? "" : "s"}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                <EyeOff className="h-3 w-3" /> Choices hidden
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[60vh] scroll-area-custom">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Voter</TableHead>
                    <TableHead className="hidden min-w-[160px] md:table-cell">Election</TableHead>
                    <TableHead className="hidden min-w-[120px] sm:table-cell">Identifier</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="hidden min-w-[140px] lg:table-cell">Verified</TableHead>
                    <TableHead className="hidden min-w-[140px] lg:table-cell">Voted</TableHead>
                    <TableHead className="hidden min-w-[90px] xl:table-cell text-right">Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, idx) => (
                    <motion.tr
                      key={a.voterId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      className="border-b last:border-0 hover:bg-accent/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{a.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {a.email ?? a.phone ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="truncate text-sm">{a.election.name}</p>
                        <p className="text-xs text-muted-foreground">{a.election.status}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="truncate font-mono text-xs">{a.uniqueIdentifier}</p>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={a.status} eligible={a.isEligible} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {a.verifiedAt ? (
                          <div>
                            <p>{formatRelative(a.verifiedAt)}</p>
                            {a.verifiedChannel && (
                              <p className="text-[10px]">via {a.verifiedChannel}</p>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {a.votedAt ? formatRelative(a.votedAt) : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right tabular-nums text-xs text-muted-foreground">
                        {a.voteDuration != null ? (
                          a.voteDuration < 60
                            ? `${a.voteDuration}s`
                            : `${Math.floor(a.voteDuration / 60)}m ${a.voteDuration % 60}s`
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {a.status !== "VOTED" && a.isEligible && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 gap-1"
                                  disabled={resendingId === a.voterId}
                                >
                                  {resendingId === a.voterId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Resend OTP</span>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Send via channel</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => resendOtp(a, "EMAIL")}>
                                  <Mail className="h-3.5 w-3.5" /> Email{a.email ? ` · ${a.email.slice(0, 20)}${a.email.length > 20 ? "…" : ""}` : ""}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => resendOtp(a, "SMS")}
                                  disabled={!a.phone}
                                >
                                  <Smartphone className="h-3.5 w-3.5" /> SMS{a.phone ? ` · ${a.phone}` : " (no phone)"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => resendOtp(a, "WHATSAPP")}
                                  disabled={!a.phone}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp{a.phone ? ` · ${a.phone}` : " (no phone)"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {a.status === "VOTED" && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <ShieldCheck className="h-3 w-3" /> Ballot cast
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  Ballot choice is secret — not visible to admins or members.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status, eligible }: { status: string; eligible: boolean }) {
  const styles: Record<string, string> = {
    REGISTERED: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    VERIFIED: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    VOTED: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={cn("text-[10px]", styles[status] ?? "")}>
        {status}
      </Badge>
      {!eligible && (
        <Badge variant="outline" className="border-destructive/30 text-[9px] text-destructive">
          ineligible
        </Badge>
      )}
    </div>
  );
}

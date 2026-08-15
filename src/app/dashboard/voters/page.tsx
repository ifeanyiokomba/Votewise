"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/dashboard/page-header";
import { ColoredBadge } from "@/components/dashboard/colored-badge";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  Vote,
  Search,
  Download,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import {
  formatNumber,
  formatPercent,
  formatDate,
  maskEmail,
  maskPhone,
  initials,
} from "@/lib/utils";
import { toast } from "sonner";

interface VoterDirectoryItem {
  id: string;
  name: string;
  matricNumber: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  phone: string | null;
  email: string | null;
  uniqueIdentifier: string;
  isEligible: boolean;
  electionId: string;
  election: { id: string; name: string; status: string };
  _count: { verificationAttempts: number; votingSessions: number };
  isVerified: boolean;
  hasVoted: boolean;
  createdAt: string;
}

interface ElectionOption {
  id: string;
  name: string;
  status: string;
}

export default function VotersDirectoryPage() {
  const router = useRouter();
  const [voters, setVoters] = useState<VoterDirectoryItem[]>([]);
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [electionFilter, setElectionFilter] = useState<string>("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, verified: 0, voted: 0, eligible: 0 });

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (electionFilter !== "all") params.set("electionId", electionFilter);
    if (eligibilityFilter !== "all") params.set("eligibility", eligibilityFilter);

    const res = await apiFetch<{ voters: VoterDirectoryItem[]; total: number }>(
      `/api/admin/voters?${params.toString()}`
    );
    setLoading(false);

    if (!res.success || !res.data) {
      toast.error("Failed to load voters", {
        description: res.error?.message,
      });
      return;
    }

    setVoters(res.data.voters);
    setTotal(res.data.total);

    // Compute aggregate stats from the loaded data
    const v = res.data.voters;
    setStats({
      total: res.data.total,
      verified: v.filter((x) => x.isVerified).length,
      voted: v.filter((x) => x.hasVoted).length,
      eligible: v.filter((x) => x.isEligible).length,
    });
  }, [search, electionFilter, eligibilityFilter]);

  // Fetch elections for the filter dropdown
  useEffect(() => {
    apiFetch<{ elections: ElectionOption[] }>("/api/elections").then((res) => {
      if (res.success && res.data) {
        setElections(res.data.elections);
      }
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchVoters(), 300);
    return () => clearTimeout(timer);
  }, [fetchVoters]);

  const exportCsv = useMemo(() => {
    return () => {
      const headers = [
        "Name",
        "Matric Number",
        "Department",
        "Faculty",
        "Level",
        "Email",
        "Phone",
        "Unique ID",
        "Election",
        "Eligible",
        "Verified",
        "Voted",
      ];
      const rows = voters.map((v) => [
        v.name,
        v.matricNumber ?? "",
        v.department ?? "",
        v.faculty ?? "",
        v.level ?? "",
        v.email ?? "",
        v.phone ?? "",
        v.uniqueIdentifier,
        v.election.name,
        v.isEligible ? "Yes" : "No",
        v.isVerified ? "Yes" : "No",
        v.hasVoted ? "Yes" : "No",
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `votewise-voters-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Voter list exported", {
        description: `${voters.length} records downloaded as CSV`,
      });
    };
  }, [voters]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <PageHeader
        eyebrow="Directory"
        title="Voters"
        description="Search and manage every voter across your organization's elections."
        actions={
          <Button onClick={exportCsv} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Voters"
          value={formatNumber(stats.total)}
          icon={Users}
          hint="Across all elections"
        />
        <StatCard
          label="Verified"
          value={formatNumber(stats.verified)}
          icon={UserCheck}
          hint="OTP confirmed"
        />
        <StatCard
          label="Voted"
          value={formatNumber(stats.voted)}
          icon={Vote}
          hint="Ballots submitted"
        />
        <StatCard
          label="Eligible"
          value={formatNumber(stats.eligible)}
          icon={CheckCircle2}
          hint="Currently eligible"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                Search voters
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, email, phone, matric number, department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Election</Label>
              <Select value={electionFilter} onValueChange={setElectionFilter}>
                <SelectTrigger className="w-full md:w-56">
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
              <Label className="text-xs font-medium text-muted-foreground">Eligibility</Label>
              <Select value={eligibilityFilter} onValueChange={setEligibilityFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="eligible">Eligible</SelectItem>
                  <SelectItem value="ineligible">Ineligible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Voter Records</CardTitle>
              <CardDescription className="text-xs">
                {loading ? "Loading..." : `${formatNumber(total)} voter${total === 1 ? "" : "s"} found`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Filter className="h-3 w-3" />
              {electionFilter === "all" ? "All elections" : "Filtered"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : voters.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No voters found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] scroll-area-custom">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Voter</TableHead>
                    <TableHead className="hidden md:table-cell">Election</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden xl:table-cell">Contact</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Voted</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voters.map((voter, idx) => (
                    <motion.tr
                      key={voter.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                      className="group border-b transition-colors hover:bg-muted/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials(voter.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{voter.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {voter.matricNumber ?? voter.uniqueIdentifier}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="max-w-[180px] truncate text-xs font-medium">
                            {voter.election.name}
                          </span>
                          <StatusBadge status={voter.election.status} className="w-fit scale-90" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {voter.department ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {voter.department}
                            {voter.level && (
                              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                                {voter.level}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {voter.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {maskEmail(voter.email)}
                            </span>
                          )}
                          {voter.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {maskPhone(voter.phone)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {voter.isEligible ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Eligible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                            Blocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {voter.isVerified ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {voter.hasVoted ? (
                          <Vote className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() =>
                            router.push(`/dashboard/elections/${voter.electionId}/voters`)
                          }
                          title="Manage in election"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

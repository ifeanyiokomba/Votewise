"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, initials, maskEmail, maskPhone } from "@/lib/utils";
import {
  Users,
  Layers,
  Repeat,
  TrendingUp,
  Mail,
  Phone,
  CheckCircle2,
  Vote,
} from "lucide-react";

interface UnifiedVoter {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  matricNumber: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  elections: {
    electionId: string;
    electionName: string;
    electionStatus: string;
    verified: boolean;
    voted: boolean;
  }[];
  totalVerified: number;
  totalVoted: number;
  electionCount: number;
}

interface UnifiedData {
  voters: UnifiedVoter[];
  summary: {
    totalIdentities: number;
    multiElectionVoters: number;
    totalParticipations: number;
    crossElectionVoters: number;
    avgElectionsPerVoter: number;
  };
}

export function UnifiedVotersCard() {
  const [data, setData] = useState<UnifiedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const res = await apiFetch<UnifiedData>("/api/admin/unified-voters");
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setData(res.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) {
    return (
      <Card>
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.voters.length === 0) return null;

  const { voters, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Unique Voters"
          value={formatNumber(summary.totalIdentities)}
          icon={Users}
          hint="Deduplicated by email/phone"
        />
        <StatCard
          label="Multi-Election"
          value={formatNumber(summary.multiElectionVoters)}
          icon={Layers}
          hint="Participated in 2+ elections"
        />
        <StatCard
          label="Cross-Election Voters"
          value={formatNumber(summary.crossElectionVoters)}
          icon={Repeat}
          hint="Voted in 2+ elections"
        />
        <StatCard
          label="Avg Elections/Voter"
          value={summary.avgElectionsPerVoter}
          icon={TrendingUp}
          hint="Participation breadth"
        />
      </div>

      {/* Unified voter list */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Unified voter identities
          </CardTitle>
          <CardDescription className="text-xs">
            Same person across multiple elections, grouped by email or phone
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[32rem] scroll-area-custom">
            <div className="space-y-2 p-3">
              {voters.map((voter, idx) => (
                <motion.div
                  key={voter.key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className={cn(
                    "rounded-lg border bg-background p-3 transition-colors hover:bg-accent/30",
                    voter.electionCount > 1 && "border-primary/20 bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {initials(voter.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{voter.name}</p>
                        {voter.electionCount > 1 && (
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                            <Layers className="mr-1 h-2.5 w-2.5" />
                            {voter.electionCount} elections
                          </Badge>
                        )}
                        {voter.totalVoted > 0 && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                            {voter.totalVoted} voted
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
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
                        {voter.department && (
                          <span className="flex items-center gap-1">
                            {voter.department}
                            {voter.level && ` · ${voter.level}`}
                          </span>
                        )}
                      </div>
                      {/* Election participation list */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {voter.elections.map((e) => (
                          <span
                            key={e.electionId}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-1.5 py-0.5 text-[10px]"
                            title={e.electionName}
                          >
                            <span className="max-w-[120px] truncate">{e.electionName}</span>
                            {e.voted ? (
                              <Vote className="h-2.5 w-2.5 text-emerald-500" />
                            ) : e.verified ? (
                              <CheckCircle2 className="h-2.5 w-2.5 text-sky-500" />
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

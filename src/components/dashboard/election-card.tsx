"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatDate, formatNumber, timeUntil } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, Users, Vote, UserSquare2, Copy, Loader2 } from "lucide-react";
import type { ElectionDTO } from "./types";

interface ElectionCardProps {
  election: ElectionDTO;
  index?: number;
  onDuplicated?: (newId: string) => void;
}

function actionForStatus(status: string): { label: string; variant: "default" | "outline" | "secondary" } {
  switch (status) {
    case "DRAFT":
    case "CONFIGURATION":
    case "VOTER_IMPORT":
    case "CANDIDATE_SETUP":
    case "VERIFICATION":
      return { label: "Configure", variant: "default" };
    case "READY":
      return { label: "Schedule", variant: "default" };
    case "SCHEDULED":
      return { label: "Open", variant: "default" };
    case "LIVE":
      return { label: "Monitor", variant: "default" };
    case "PAUSED":
      return { label: "Resume", variant: "outline" };
    case "CLOSED":
      return { label: "Review", variant: "outline" };
    case "RESULTS_REVIEW":
      return { label: "Publish", variant: "default" };
    case "PUBLISHED":
      return { label: "View results", variant: "outline" };
    case "ARCHIVED":
      return { label: "Archived", variant: "secondary" };
    default:
      return { label: "Manage", variant: "default" };
  }
}

export function ElectionCard({ election, index = 0, onDuplicated }: ElectionCardProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const voters = election._count?.voters ?? 0;
  const positions = election._count?.positions ?? 0;
  const candidates = election._count?.candidates ?? 0;
  const votes = election._count?.votes ?? 0;
  const turnout = voters > 0 ? Math.round((votes / voters) * 100) : 0;
  const isLive = election.status === "LIVE";
  const isArchived = election.status === "ARCHIVED";

  const action = actionForStatus(election.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
    >
      <Card
        className={cn(
          "group h-full overflow-hidden transition-all hover-lift hover:shadow-md",
          isLive && "border-primary/40 shadow-sm glow-primary"
        )}
      >
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {election.type.replace(/_/g, " ").toLowerCase()}
              </p>
              <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight">
                {election.name}
              </h3>
            </div>
            <StatusBadge status={election.status} />
          </div>

          {election.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {election.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/30 px-2 py-2">
              <div className="grid place-items-center text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(voters)}
              </p>
              <p className="text-[10px] text-muted-foreground">Voters</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-2 py-2">
              <div className="grid place-items-center text-muted-foreground">
                <UserSquare2 className="h-3.5 w-3.5" />
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(candidates)}
              </p>
              <p className="text-[10px] text-muted-foreground">Cands</p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-2 py-2">
              <div className="grid place-items-center text-muted-foreground">
                <Vote className="h-3.5 w-3.5" />
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(votes)}
              </p>
              <p className="text-[10px] text-muted-foreground">Votes</p>
            </div>
          </div>

          {voters > 0 && !isArchived && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Turnout</span>
                <span className="font-medium text-foreground tabular-nums">{turnout}%</span>
              </div>
              <Progress value={turnout} className="h-1.5" />
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {election.startTime
                  ? formatDate(election.startTime)
                  : "Not scheduled"}
              </span>
            </div>
            {isLive && election.endTime && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                ends {timeUntil(election.endTime)}
              </Badge>
            )}
            {election.status === "SCHEDULED" && election.startTime && (
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                in {timeUntil(election.startTime)}
              </Badge>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant={action.variant}
              className="flex-1"
              disabled={isArchived}
            >
              <Link
                href={`/dashboard/elections/${election.id}`}
                className={cn(isArchived && "pointer-events-none opacity-60")}
              >
                {action.label}
                {!isArchived && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-2.5"
              disabled={duplicating}
              onClick={async () => {
                setDuplicating(true);
                const res = await apiFetch<{ election: { id: string } }>(
                  `/api/elections/${election.id}/duplicate`,
                  { method: "POST" }
                );
                setDuplicating(false);
                if (!res.success || !res.data?.election) {
                  toast.error("Could not duplicate election", { description: res.error?.message });
                  return;
                }
                toast.success("Election duplicated", {
                  description: "Positions and candidates copied. Voters and votes are not carried over.",
                });
                if (onDuplicated) {
                  onDuplicated(res.data.election.id);
                } else {
                  router.push(`/dashboard/elections/${res.data.election.id}`);
                }
              }}
              title="Duplicate election (copy positions & candidates)"
              aria-label="Duplicate election"
            >
              {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { LifecycleControl } from "./lifecycle-control";
import { LiveMonitorBadge } from "./live-monitor-badge";
import { ELECTION_TABS } from "./nav-config";
import { apiFetch } from "@/lib/api-fetch";
import { formatDate, timeUntil, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarRange,
  Pencil,
  Clock,
  Loader2,
  Save,
} from "lucide-react";
import type { ElectionDTO } from "./types";

interface ElectionShellProps {
  electionId: string;
  activeTab: string;
  children: React.ReactNode;
  /** Re-fetch trigger (e.g. when a tab fires a mutation that affects header counts) */
  refreshKey?: number;
}

const TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  FACULTY: "Faculty",
  DEPARTMENT: "Department",
  EXECUTIVE: "Executive",
  CONFIDENCE: "Confidence Vote",
  BALLOT_MEASURE: "Ballot Measure",
};

export function ElectionShell({
  electionId,
  activeTab,
  children,
  refreshKey = 0,
}: ElectionShellProps) {
  const router = useRouter();
  const [election, setElection] = useState<ElectionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchElection = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ election: ElectionDTO | null }>(
      `/api/elections/${electionId}`
    );
    setLoading(false);
    if (res.success && res.data?.election) {
      setElection(res.data.election);
      setEditName(res.data.election.name);
      setEditDescription(res.data.election.description ?? "");
    }
  }, [electionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchElection();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchElection, refreshKey]);

  async function saveEdits() {
    if (!election) return;
    setSaving(true);
    const res = await apiFetch<{ election: ElectionDTO }>(
      `/api/elections/${electionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      }
    );
    setSaving(false);
    if (!res.success || !res.data?.election) {
      toast.error("Could not update election", {
        description: res.error?.message,
      });
      return;
    }
    setElection(res.data.election);
    setEditOpen(false);
    toast.success("Election updated");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
            {loading || !election ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABELS[election.type] ?? election.type}
                      </Badge>
                      <StatusBadge status={election.status} />
                      <LiveMonitorBadge electionId={election.id} status={election.status} />
                    </div>
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight sm:text-2xl">
                      <span className="truncate">{election.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditOpen(true)}
                        aria-label="Edit election details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </CardTitle>
                    {election.description && (
                      <CardDescription className="max-w-2xl">
                        {election.description}
                      </CardDescription>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {election.startTime ? formatDate(election.startTime) : "Not scheduled"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {election.endTime ? formatDate(election.endTime) : "Open-ended"}
                  </span>
                  {election.status === "LIVE" && election.endTime && (
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      <Clock className="h-3 w-3" />
                      ends in {timeUntil(election.endTime)}
                    </Badge>
                  )}
                  {election.status === "SCHEDULED" && election.startTime && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                      <Clock className="h-3 w-3" />
                      starts in {timeUntil(election.startTime)}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardHeader>

          {!loading && election && (
            <CardContent className="px-4 py-4 sm:px-6">
              <LifecycleControl
                election={election}
                onTransitioned={fetchElection}
                onActivationRequired={() =>
                  router.push(`/dashboard/elections/${electionId}/activate`)
                }
              />
            </CardContent>
          )}
        </Card>

        {/* Tabs nav */}
        <div className="mt-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {ELECTION_TABS.map((tab) => {
            const href =
              tab.href === ""
                ? `/dashboard/elections/${electionId}`
                : `/dashboard/elections/${electionId}${tab.href}`;
            const isActive = activeTab === tab.value;
            return (
              <Link
                key={tab.value}
                href={href}
                className={cn(
                  "relative flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors sm:text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </motion.div>

      <div>{children}</div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit election details</DialogTitle>
            <DialogDescription>
              Update the name and description shown to voters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveEdits} disabled={saving || !editName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

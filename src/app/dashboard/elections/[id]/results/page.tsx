"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { PositionResultsCard } from "@/components/dashboard/results-bar";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Vote,
  TrendingUp,
  Globe,
  CheckCircle2,
  Loader2,
  Send,
  Download,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";
import type {
  ElectionResultsDTO,
  ElectionDTO,
} from "@/components/dashboard/types";

interface ResultsResponse {
  results: ElectionResultsDTO;
  visible: boolean;
}
interface ElectionResponse {
  election: ElectionDTO | null;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [results, setResults] = useState<ElectionResultsDTO | null>(null);
  const [election, setElection] = useState<ElectionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
    const [rRes, eRes] = await Promise.all([
      apiFetch<ResultsResponse>(`/api/elections/${electionId}/results`),
      apiFetch<ElectionResponse>(`/api/elections/${electionId}`),
    ]);
    setLoading(false);
    if (rRes.success && rRes.data) {
      setResults(rRes.data.results);
    } else {
      setError(rRes.error?.message ?? "Could not load results");
    }
    if (eRes.success && eRes.data) {
      setElection(eRes.data.election);
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
  }, [load]);

  async function publish() {
    if (!electionId) return;
    setPublishing(true);
    const res = await apiFetch<{ election: ElectionDTO }>(
      `/api/elections/${electionId}/results/publish`,
      { method: "POST" }
    );
    setPublishing(false);
    if (!res.success || !res.data?.election) {
      toast.error("Could not publish results", { description: res.error?.message });
      setPublishOpen(false);
      return;
    }
    toast.success("Results published", {
      description: "Voters can now verify their ballots and view outcomes.",
    });
    setPublishOpen(false);
    load();
  }

  const canPublish =
    election &&
    ["CLOSED", "RESULTS_REVIEW", "PUBLISHED"].includes(election.status);
  const isPublished = election?.status === "PUBLISHED";

  function exportResultsCsv() {
    if (!results) return;
    const headers = [
      "Position",
      "Rank",
      "Candidate",
      "Votes",
      "Percentage",
      "Winner",
    ];
    const rows: string[][] = [];
    for (const pos of results.positions) {
      for (const cand of pos.candidates) {
        rows.push([
          pos.position.title,
          String(cand.rank),
          cand.name,
          String(cand.voteCount),
          `${cand.percentage.toFixed(1)}%`,
          pos.winnerId === cand.id ? "Yes" : pos.isTie ? "Tie" : "No",
        ]);
      }
    }
    // Add summary rows
    rows.push([]);
    rows.push(["Election", election?.name ?? ""]);
    rows.push(["Total Votes", String(results.totalVotes)]);
    rows.push(["Total Voters", String(results.totalVoters)]);
    rows.push(["Turnout", `${results.turnout.toFixed(1)}%`]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votewise-results-${election?.name?.replace(/[^a-z0-9]/gi, "-").toLowerCase() ?? "election"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported", {
      description: "CSV file downloaded with full position breakdown.",
    });
  }

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="results">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Results</h2>
            <p className="text-sm text-muted-foreground">
              Live tally of votes cast across every position. Publish when you&apos;re ready to make outcomes public.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {results && results.totalVotes > 0 && (
              <Button onClick={exportResultsCsv} variant="outline" size="sm">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
            {isPublished ? (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                <Globe className="h-3 w-3" /> Published
              </Badge>
            ) : (
              canPublish && (
                <Button onClick={() => setPublishOpen(true)}>
                  <Send className="h-4 w-4" /> Publish results
                </Button>
              )
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !results ? (
          <ErrorState message="No results available" />
        ) : results.positions.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="No positions to tally"
                description="Add positions and candidates first — results will appear here once votes are cast."
                icon={BarChart3}
              />
            </CardContent>
          </Card>
        ) : results.totalVotes === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="No votes cast yet"
                description="Once voters start casting ballots, live tallies will appear here in real time."
                icon={Vote}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Turnout summary */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Turnout
                  </CardTitle>
                  <CardDescription>Overall participation across all positions.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
                  <Stat
                    icon={Users}
                    label="Eligible voters"
                    value={formatNumber(results.totalVoters)}
                  />
                  <Stat
                    icon={Vote}
                    label="Ballots cast"
                    value={formatNumber(results.totalVotes)}
                  />
                  <div className="rounded-lg border bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        Turnout
                      </span>
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {formatPercent(results.turnout)}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                      {formatPercent(results.turnout)}
                    </p>
                    <Progress value={results.turnout} className="mt-2 h-1.5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Per-position results */}
            <div className="grid gap-4">
              {results.positions.map((pos, idx) => (
                <motion.div
                  key={pos.position.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.05, 0.3) }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{pos.position.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {pos.candidates.length}{" "}
                            {pos.candidates.length === 1 ? "candidate" : "candidates"}
                          </Badge>
                          {pos.winnerId && !pos.isTie && (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Winner declared
                            </Badge>
                          )}
                        </div>
                      </div>
                      {pos.position.description && (
                        <CardDescription>{pos.position.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-4">
                      <PositionResultsCard
                        totalVotes={pos.totalVotes}
                        candidates={pos.candidates}
                        winnerId={pos.winnerId}
                        isTie={pos.isTie}
                        totalVoters={results.totalVoters}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Publish results publicly?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will make results visible on the public results page and enable ballot
              verification for voters. The election status will move to PUBLISHED.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={publish}
              disabled={publishing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Publish
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ElectionShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  Share2,
  ShieldCheck,
  Users,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Clock,
  LockKeyhole,
  BarChart3,
  Link2,
  ReceiptText,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatPercent, initials } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

type CandidateResult = {
  id: string;
  name: string;
  photo: string | null;
  voteCount: number;
  percentage: number;
  rank: number;
};

type PositionResult = {
  position: { id: string; title: string; description: string | null };
  totalVotes: number;
  candidates: CandidateResult[];
  winnerId: string | null;
  isTie: boolean;
};

type ElectionResults = {
  electionId: string;
  electionName: string;
  totalVotes: number;
  totalVoters: number;
  turnout: number;
  positions: PositionResult[];
};

type UnpublishedResponse = {
  published: false;
  status: string;
  electionName: string;
  electionId: string;
};

type PublishedResponse = {
  published: true;
  election: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    endTime: string | null;
  };
  results: ElectionResults;
};

type PublicResultsResponse = UnpublishedResponse | PublishedResponse;

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsInner />
    </Suspense>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mx-auto h-8 w-72" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function ResultsInner() {
  const params = useParams<{ id: string }>();
  const electionId = params.id;

  const [data, setData] = React.useState<PublicResultsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reduce = useReducedMotion();

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await apiFetch<PublicResultsResponse>(
        `/api/public/results/${electionId}`
      );
      if (cancelled) return;
      setLoading(false);
      if (!res.success || !res.data) {
        setError(res.error?.message ?? "Couldn't load results.");
        return;
      }
      setData(res.data);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  async function share() {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.published ? data.election.name : "Election results",
          text: "View the official election results on Votewise.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", {
          description: "Share it with anyone who wants to verify the tally.",
        });
      }
    } catch {
      // user dismissed share sheet — silent
    }
  }

  if (loading) return <ResultsSkeleton />;

  if (error || !data) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Results unavailable
          </CardTitle>
          <CardDescription>
            {error ??
              "We couldn't load the results for this election."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/">Back to home</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Unpublished — show the right "not yet" state
  if (!data.published) {
    return (
      <UnpublishedState
        electionName={data.electionName}
        status={data.status}
        electionId={data.electionId}
      />
    );
  }

  const { election, results } = data;
  const isLive = election.status === "LIVE";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center"
      >
        <div className="mb-3 flex justify-center">
          <StatusBadge status={election.status} />
        </div>
        <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {election.name}
        </h1>
        {election.description && (
          <p className="mx-auto mt-2 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
            {election.description}
          </p>
        )}
      </motion.div>

      {/* Topline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Users className="size-4 text-primary" />}
          label="Total votes cast"
          value={formatNumber(results.totalVotes)}
        />
        <StatTile
          icon={<BarChart3 className="size-4 text-primary" />}
          label="Turnout"
          value={formatPercent(results.turnout)}
          hint={`${formatNumber(results.totalVoters)} eligible voters`}
        />
        <StatTile
          icon={<Trophy className="size-4 text-primary" />}
          label="Positions"
          value={formatNumber(results.positions.length)}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Tamper-evident · Independently auditable</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="size-3.5" />
            Share results
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/verify-ballot">
              <Link2 className="size-3.5" />
              Verify a ballot
            </a>
          </Button>
        </div>
      </div>

      {isLive && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <Clock className="size-4" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            Live results — partial tally
          </AlertTitle>
          <AlertDescription>
            Voting is still in progress. These numbers update in real time and
            may change as more ballots are cast.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Positions */}
      <div className="space-y-6">
        {results.positions.map((pos, idx) => (
          <motion.section
            key={pos.position.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.2) }}
          >
            <Card className="border-border/70">
              <CardHeader className="gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg leading-tight">
                      {pos.position.title}
                    </CardTitle>
                    {pos.position.description && (
                      <CardDescription className="mt-1">
                        {pos.position.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border text-xs text-muted-foreground"
                  >
                    {formatNumber(pos.totalVotes)}{" "}
                    {pos.totalVotes === 1 ? "vote" : "votes"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pos.candidates.length === 0 ? (
                  <p className="rounded-md bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    No candidates were listed for this position.
                  </p>
                ) : (
                  pos.candidates.map((c, cIdx) => {
                    const isWinner = pos.winnerId === c.id;
                    const isTiedAtTop = pos.isTie && c.rank === 1;
                    return (
                      <CandidateRow
                        key={c.id}
                        candidate={c}
                        isWinner={isWinner}
                        isTiedAtTop={isTiedAtTop}
                        rank={cIdx + 1}
                        totalVotes={pos.totalVotes}
                        reduce={reduce}
                      />
                    );
                  })
                )}

                {/* Outcome footer */}
                {pos.totalVotes > 0 && (
                  <div className="pt-1">
                    {pos.isTie ? (
                      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertCircle className="size-3.5" />
                        Tie at the top — no outright winner.
                      </div>
                    ) : pos.winnerId ? (
                      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success">
                        <CheckCircle2 className="size-3.5" />
                        Winner declared:{" "}
                        {pos.candidates.find(
                          (c) => c.id === pos.winnerId
                        )?.name ?? "—"}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                        <LockKeyhole className="size-3.5" />
                        No votes recorded for this position.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>
        ))}
      </div>

      {/* Footer CTA */}
      <Separator />
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <ReceiptText className="size-5 text-primary" />
            <span className="font-medium">
              Cast a ballot in this election? Verify it was received.
            </span>
          </div>
          <Button asChild>
            <a href="/verify-ballot">
              Verify a ballot
              <ChevronRight className="size-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UnpublishedState({
  electionName,
  status,
  electionId,
}: {
  electionName: string;
  status: string;
  electionId: string;
}) {
  const isLive = status === "LIVE";
  const isClosed =
    status === "CLOSED" || status === "RESULTS_REVIEW";
  const isScheduled = status === "SCHEDULED" || status === "READY";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-3 flex justify-center">
          <StatusBadge status={status} />
        </div>
        <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {electionName}
        </h1>
      </div>

      <Card className="border-border/70">
        <CardHeader className="items-center text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary">
            {isLive ? (
              <BarChart3 className="size-6 text-primary" />
            ) : (
              <LockKeyhole className="size-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isLive
              ? "Voting in progress"
              : isClosed
                ? "Results being tallied"
                : isScheduled
                  ? "Voting opens soon"
                  : "Results are not yet public"}
          </CardTitle>
          <CardDescription>
            {isLive
              ? "To protect voter privacy, live results are not shown while voting is open. Candidate tallies will appear here once voting closes and the results are officially published."
              : isClosed
                ? "Voting has closed. The election administrator is reviewing and certifying results before publication. Check back shortly."
                : isScheduled
                  ? "This election has not started yet. Results will be published after voting closes."
                  : "Election administrators are still preparing this election. Results will be published once voting closes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button asChild variant="outline">
            <a href={`/vote/${electionId}`}>
              <ChevronRight className="size-4" />
              Go to voting page
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Questions? Contact your election administrator.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        <span>Results are independently auditable once published.</span>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CandidateRow({
  candidate,
  isWinner,
  isTiedAtTop,
  rank,
  totalVotes,
  reduce,
}: {
  candidate: CandidateResult;
  isWinner: boolean;
  isTiedAtTop: boolean;
  rank: number;
  totalVotes: number;
  reduce: boolean | null;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isWinner
          ? "border-success/50 bg-success/5"
          : "border-border/70 bg-background"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-xs font-bold",
              isWinner
                ? "bg-success text-success-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {rank}
          </span>
          {candidate.photo ? (
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={candidate.photo} alt="" />
              <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
              {initials(candidate.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold leading-tight">
                {candidate.name}
              </span>
              {isWinner && !isTiedAtTop && (
                <Badge className="bg-success text-success-foreground">
                  <Trophy className="size-3" />
                  Winner
                </Badge>
              )}
              {isTiedAtTop && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  Tied
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums">
                {formatNumber(candidate.voteCount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatPercent(candidate.percentage)}
              </span>
            </div>
          </div>

          <div className="mt-2">
            <Progress
              value={candidate.percentage}
              className={cn(
                "h-2",
                isWinner && "bg-success/20 [&_[data-slot=progress-indicator]]:bg-success"
              )}
            />
          </div>

          {!reduce && candidate.percentage > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {totalVotes === 0
                ? "No votes"
                : `${formatNumber(candidate.voteCount)} of ${formatNumber(
                    totalVotes
                  )} ballots`}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

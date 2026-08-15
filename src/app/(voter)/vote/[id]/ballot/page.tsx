"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Check,
  LockKeyhole,
  ShieldCheck,
  Eye,
  Send,
  ChevronLeft,
  Users,
  CheckCircle2,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
import { cn, initials, truncate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoterProgress } from "@/components/shared/voter-progress";
import { Skeleton } from "@/components/ui/skeleton";

type Candidate = {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  manifesto: string | null;
};

type Position = {
  id: string;
  title: string;
  description: string | null;
  maxChoices: number;
  candidates: Candidate[];
};

type Ballot = {
  electionName: string;
  positions: Position[];
};

type VotingSession = {
  id: string;
  anonymousToken?: string;
};

type VoteResponse =
  | { session: VotingSession; ballot: Ballot }
  | { alreadyVoted: true; session: null };

type CastResponse = {
  receipt: string;
  count: number;
};

export default function BallotPage() {
  return (
    <Suspense fallback={<BallotSkeleton />}>
      <BallotInner />
    </Suspense>
  );
}

function BallotSkeleton() {
  return (
    <div className="space-y-6 pb-32">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mx-auto h-8 w-64" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function BallotInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const electionId = params.id;
  const voterIdFromQuery = search.get("voterId");

  const [voterId, setVoterId] = React.useState<string | null>(
    voterIdFromQuery ?? null
  );
  const [session, setSession] = React.useState<VotingSession | null>(null);
  const [ballot, setBallot] = React.useState<Ballot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [retryNonce, setRetryNonce] = React.useState(0);
  const [fatal, setFatal] = React.useState<
    | { kind: "not_live" | "ineligible" | "already_voted"; message: string }
    | null
  >(null);

  // selections: positionId -> candidateId[] (always array even for single-choice)
  const [selections, setSelections] = React.useState<
    Record<string, string[]>
  >({});

  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [casting, setCasting] = React.useState(false);

  const reduce = useReducedMotion();

  // Recover voterId from sessionStorage if missing
  React.useEffect(() => {
    if (voterId) return;
    try {
      const raw = sessionStorage.getItem(`votewise:voter:${electionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { voterId?: string };
        if (parsed.voterId) {
          setVoterId(parsed.voterId);
          return;
        }
      }
    } catch {
      // ignore
    }
    router.replace(`/vote/${electionId}`);
  }, [voterId, electionId, router]);

  // Fetch ballot
  React.useEffect(() => {
    if (!voterId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      setFatal(null);
      const res = await apiFetch<VoteResponse>("/api/voter/vote", {
        method: "POST",
        body: JSON.stringify({ voterId, electionId }),
      });
      if (cancelled) return;
      setLoading(false);

      if (!res.success || !res.data) {
        const msg = res.error?.message ?? "Could not load your ballot.";
        const code = res.error?.code;
        if (code === "ELECTION_NOT_LIVE") {
          setFatal({
            kind: "not_live",
            message:
              "This election is not currently live. Please return later.",
          });
          return;
        }
        if (code === "INELIGIBLE") {
          setFatal({
            kind: "ineligible",
            message:
              "You are not eligible to vote in this election. Contact your election administrator.",
          });
          return;
        }
        setLoadError(msg);
        return;
      }

      const data = res.data;
      if ("alreadyVoted" in data && data.alreadyVoted) {
        setFatal({
          kind: "already_voted",
          message:
            "A ballot has already been cast from your account. You cannot vote again.",
        });
        toast.info("Already voted", {
          description: "Redirecting to your receipt…",
        });
        setTimeout(() => {
          router.replace(
            `/vote/${electionId}/receipt?alreadyVoted=1&voterId=${encodeURIComponent(
              voterId!
            )}`
          );
        }, 1200);
        return;
      }

      setSession(data.session);
      setBallot(data.ballot);
      try {
        sessionStorage.setItem(
          `votewise:session:${electionId}`,
          JSON.stringify({
            sessionId: data.session.id,
            voterId,
            ts: Date.now(),
          })
        );
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [voterId, electionId, router, retryNonce]);

  function selectSingle(positionId: string, candidateId: string) {
    setSelections((prev) => ({ ...prev, [positionId]: [candidateId] }));
  }

  function toggleMulti(
    positionId: string,
    candidateId: string,
    maxChoices: number
  ) {
    setSelections((prev) => {
      const current = prev[positionId] ?? [];
      const has = current.includes(candidateId);
      let next: string[];
      if (has) {
        next = current.filter((c) => c !== candidateId);
      } else {
        if (current.length >= maxChoices) {
          toast.warning("Maximum choices reached", {
            description: `You can select up to ${maxChoices} candidate${
              maxChoices === 1 ? "" : "s"
            } for this position.`,
          });
          return prev;
        }
        next = [...current, candidateId];
      }
      return { ...prev, [positionId]: next };
    });
  }

  const totalPositions = ballot?.positions.length ?? 0;
  // Positions with at least one candidate are the ones a voter must answer.
  // Empty positions are shown but skipped from the "required" count.
  const requiredPositions =
    ballot?.positions.filter((p) => p.candidates.length > 0).length ?? 0;
  const answeredPositions = ballot
    ? ballot.positions.filter(
        (p) =>
          p.candidates.length > 0 && (selections[p.id]?.length ?? 0) > 0
      ).length
    : 0;
  const allAnswered =
    requiredPositions > 0 && answeredPositions === requiredPositions;

  async function onCast() {
    if (!voterId || !session || !ballot) return;
    setCasting(true);
    const votes: { positionId: string; candidateId: string }[] = [];
    for (const p of ballot.positions) {
      const sel = selections[p.id] ?? [];
      for (const candidateId of sel) {
        votes.push({ positionId: p.id, candidateId });
      }
    }
    if (votes.length === 0) {
      setCasting(false);
      setReviewOpen(false);
      toast.error("No selections", {
        description: "Please choose at least one candidate.",
      });
      return;
    }
    const res = await apiFetch<CastResponse>("/api/voter/vote/cast", {
      method: "POST",
      body: JSON.stringify({
        voterId,
        electionId,
        sessionId: session.id,
        votes,
      }),
    });
    setCasting(false);
    if (!res.success || !res.data) {
      const msg = res.error?.message ?? "Could not cast your vote.";
      const code = res.error?.code;
      toast.error("Vote not cast", { description: msg });
      if (
        code === "FORBIDDEN" ||
        msg.toLowerCase().includes("session") ||
        msg.toLowerCase().includes("verified")
      ) {
        // session invalid → back to landing
        setTimeout(() => router.replace(`/vote/${electionId}`), 1200);
        return;
      }
      if (msg.toLowerCase().includes("already")) {
        setTimeout(
          () =>
            router.replace(
              `/vote/${electionId}/receipt?alreadyVoted=1&voterId=${encodeURIComponent(
                voterId
              )}`
            ),
          1200
        );
        return;
      }
      return;
    }
    toast.success("Vote recorded!", {
      description: "Generating your tamper-evident receipt…",
    });
    setReviewOpen(false);
    // Clean up voter/session storage so the voter can't re-cast
    try {
      sessionStorage.removeItem(`votewise:session:${electionId}`);
      sessionStorage.removeItem(`votewise:voter:${electionId}`);
    } catch {
      // ignore
    }
    router.push(
      `/vote/${electionId}/receipt?reference=${encodeURIComponent(
        res.data.receipt
      )}&count=${res.data.count}`
    );
  }

  if (loading) return <BallotSkeleton />;

  if (fatal) {
    return (
      <div className="space-y-6">
        <VoterProgress current="vote" />
        <Card className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              {fatal.kind === "already_voted"
                ? "Already voted"
                : fatal.kind === "not_live"
                  ? "Voting not open"
                  : "Not eligible"}
            </CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-300">
              {fatal.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href={`/vote/${electionId}`}>Back to election</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !ballot || !session) {
    return (
      <div className="space-y-6">
        <VoterProgress current="vote" />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Couldn&apos;t load your ballot
            </CardTitle>
            <CardDescription>
              {loadError ?? "Please try again in a moment."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/vote/${electionId}`)}
            >
              <ChevronLeft className="size-4" />
              Back to start
            </Button>
            <Button
              onClick={() => setRetryNonce((n) => n + 1)}
            >
              <Loader2 className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40">
      <VoterProgress current="vote" />

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {ballot.electionName}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          Select your candidate for each position below. Your choices are
          final once you cast your ballot.
        </p>
      </div>

      <Alert className="border-primary/30 bg-primary/5">
        <LockKeyhole className="size-4 text-primary" />
        <AlertTitle className="text-primary">Your vote is anonymous</AlertTitle>
        <AlertDescription>
          Your selections will be stored against a one-time anonymous token —
          not your name or contact. Even administrators cannot link your
          choices back to you.
        </AlertDescription>
      </Alert>

      {ballot.positions.map((position, idx) => {
        const selected = selections[position.id] ?? [];
        const isSingle = position.maxChoices === 1;
        return (
          <motion.section
            key={position.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.2) }}
          >
            <Card className="border-border/70">
              <CardHeader className="gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg leading-tight">
                      <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      {position.title}
                    </CardTitle>
                    {position.description && (
                      <CardDescription className="text-sm">
                        {position.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border text-xs text-muted-foreground"
                  >
                    {isSingle
                      ? "Choose 1"
                      : `Choose up to ${position.maxChoices}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {position.candidates.length === 0 ? (
                  <p className="rounded-md bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    No candidates listed for this position.
                  </p>
                ) : isSingle ? (
                  <RadioGroup
                    value={selected[0] ?? ""}
                    onValueChange={(v) => selectSingle(position.id, v)}
                    className="gap-2.5"
                  >
                    {position.candidates.map((c) => {
                      const isSel = selected[0] === c.id;
                      const cId = `${position.id}-${c.id}`;
                      return (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          selected={isSel}
                          htmlFor={cId}
                        >
                          <RadioGroupItem
                            value={c.id}
                            id={cId}
                            className="mt-1 size-4"
                            aria-label={`Vote for ${c.name}`}
                          />
                        </CandidateCard>
                      );
                    })}
                  </RadioGroup>
                ) : (
                  <div className="grid gap-2.5">
                    {position.candidates.map((c) => {
                      const isSel = selected.includes(c.id);
                      const cId = `${position.id}-${c.id}`;
                      return (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          selected={isSel}
                          htmlFor={cId}
                        >
                          <Checkbox
                            id={cId}
                            checked={isSel}
                            onCheckedChange={() =>
                              toggleMulti(
                                position.id,
                                c.id,
                                position.maxChoices
                              )
                            }
                            className="mt-1 size-4"
                            aria-label={`Vote for ${c.name}`}
                          />
                        </CandidateCard>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {selected.length} of{" "}
                  {isSingle ? 1 : position.maxChoices} selected
                </p>
              </CardContent>
            </Card>
          </motion.section>
        );
      })}

      {/* Sticky review bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="size-4 text-primary" />
            <span className="font-medium">
              {answeredPositions}
              <span className="text-muted-foreground">
                {" "}
                / {totalPositions} positions
              </span>
            </span>
          </div>
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild>
              <Button size="lg" disabled={!allAnswered} className="min-w-44">
                <Eye className="size-4" />
                Review selection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto scroll-area-custom sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Review your ballot
                </DialogTitle>
                <DialogDescription>
                  This is your last chance to change your mind. Once you cast
                  your vote, you cannot change it.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {ballot.positions.map((p) => {
                  const sel = selections[p.id] ?? [];
                  const chosen = p.candidates.filter((c) =>
                    sel.includes(c.id)
                  );
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {p.title}
                      </div>
                      {chosen.length === 0 ? (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          No selection
                        </p>
                      ) : (
                        <ul className="mt-1.5 space-y-1">
                          {chosen.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center gap-2 text-sm font-medium"
                            >
                              <Check className="size-3.5 text-success" />
                              {c.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-foreground">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p>
                  By casting your vote, you confirm these selections are
                  final. Your ballot will be encrypted and stored anonymously.
                </p>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <DialogClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Go back
                  </Button>
                </DialogClose>
                <Button
                  onClick={onCast}
                  disabled={casting}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {casting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Casting…
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Confirm &amp; cast vote
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  selected,
  htmlFor,
  children,
}: {
  candidate: Candidate;
  selected: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all outline-none focus-within:ring-2 focus-within:ring-ring/40",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
      )}
    >
      {children}
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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold leading-tight">{candidate.name}</span>
          {selected && (
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
          )}
        </div>
        {candidate.manifesto && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {truncate(candidate.manifesto, 140)}
          </p>
        )}
        {candidate.bio && !candidate.manifesto && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {truncate(candidate.bio, 140)}
          </p>
        )}
      </div>
    </label>
  );
}

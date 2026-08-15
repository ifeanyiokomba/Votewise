"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  IdCard,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  LockKeyhole,
  Vote,
  ReceiptText,
  ArrowRight,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { VoterProgress } from "@/components/shared/voter-progress";
import { Skeleton } from "@/components/ui/skeleton";

type ElectionPublicInfo =
  | {
      published: false;
      status: string;
      electionName: string;
      electionId: string;
    }
  | {
      published: true;
      election: {
        id: string;
        name: string;
        status: string;
        description: string | null;
        endTime: string | null;
      };
      results: unknown;
    };

type VerifySendResponse =
  | {
      sent: boolean;
      attemptsRemaining?: number;
      voterId: string;
      channel?: "EMAIL" | "SMS" | "WHATSAPP";
      devCode?: string;
    }
  | { alreadyVoted: true; voterId: string };

const FLOW_STEPS = [
  {
    icon: LockKeyhole,
    label: "Verify",
    desc: "Confirm your identity with a one-time code.",
  },
  {
    icon: Vote,
    label: "Vote",
    desc: "Pick your candidate for each position.",
  },
  {
    icon: ShieldCheck,
    label: "Confirm",
    desc: "Review your selections, then cast.",
  },
  {
    icon: ReceiptText,
    label: "Receipt",
    desc: "Get a tamper-evident reference number.",
  },
];

export default function ElectionLandingPage() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <LandingInner />
    </Suspense>
  );
}

function LandingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mx-auto h-8 w-56 animate-pulse rounded-md bg-muted" />
      <Skeleton className="mx-auto h-5 w-72" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function LandingInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const electionId = params.id;

  const [info, setInfo] = React.useState<ElectionPublicInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [lookup, setLookup] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reduce = useReducedMotion();

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      const res = await apiFetch<ElectionPublicInfo>(
        `/api/public/results/${electionId}`
      );
      if (cancelled) return;
      if (!res.success || !res.data) {
        setLoadError(
          res.error?.message ?? "We couldn't load this election."
        );
      } else {
        setInfo(res.data);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [electionId]);

  const status = info ? (info.published ? info.election.status : info.status) : null;
  const electionName = info
    ? info.published
      ? info.election.name
      : info.electionName
    : null;
  const isLive = status === "LIVE";
  const isPublished = info?.published === true;
  const isClosed =
    status === "CLOSED" ||
    status === "RESULTS_REVIEW" ||
    status === "ARCHIVED" ||
    isPublished;
  const isScheduled = status === "SCHEDULED" || status === "READY";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLive) return;
    const trimmed = lookup.trim();
    if (!trimmed) {
      setError("Enter your voter ID, email, phone, or matric number.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<VerifySendResponse>("/api/voter/verify", {
        method: "POST",
        body: JSON.stringify({
          electionId,
          voterId: trimmed,
        }),
      });

      if (!res.success || !res.data) {
        const msg = res.error?.message ?? "Something went wrong. Try again.";
        setError(msg);
        toast.error("Couldn't send code", { description: msg });
        return;
      }

      const data = res.data;

      if ("alreadyVoted" in data && data.alreadyVoted) {
        toast.info("Already voted", {
          description: "We found a ballot already cast from your account.",
        });
        router.push(
          `/vote/${electionId}/receipt?alreadyVoted=1&voterId=${encodeURIComponent(
            data.voterId
          )}`
        );
        return;
      }

      if (data.sent === false) {
        setError(
          "Too many attempts. Please wait a minute and try again."
        );
        toast.error("Too many attempts", {
          description: "Wait a moment before requesting another code.",
        });
        return;
      }

      // Persist for cross-page recovery
      try {
        sessionStorage.setItem(
          `votewise:voter:${electionId}`,
          JSON.stringify({
            voterId: data.voterId,
            channel: data.channel,
            ts: Date.now(),
          })
        );
      } catch {
        // sessionStorage can throw in private mode — ignore.
      }

      const params = new URLSearchParams({
        voterId: data.voterId,
      });
      if (data.channel) params.set("channel", data.channel);
      router.push(`/vote/${electionId}/verify?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LandingSkeleton />;

  if (loadError || !info || !status || !electionName) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Election unavailable
          </CardTitle>
          <CardDescription>
            {loadError ??
              "We couldn't load this election. The link may be invalid or the election may have been archived."}
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

  return (
    <div className="space-y-6">
      <VoterProgress current="verify" />

      {/* Hero */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center"
      >
        <div className="mb-3 flex justify-center">
          <StatusBadge status={status} className="text-sm" />
        </div>
        <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {electionName}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-balance text-sm text-muted-foreground sm:text-base">
          {isPublished
            ? "This election has concluded and the results are now public."
            : isLive
              ? "Verify your identity to receive your ballot. Your vote is secret and your choices cannot be traced back to you."
              : "Welcome. Voting for this election is not currently open."}
        </p>
      </motion.div>

      {/* Closed / Scheduled / Published states */}
      {!isLive && (
        <Card className="border-border/70">
          <CardHeader className="items-center text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary">
              {isClosed ? (
                <CheckCircle2 className="size-6 text-primary" />
              ) : (
                <Clock className="size-6 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-xl">
              {isPublished
                ? "Results are public"
                : isClosed
                  ? "Voting has closed"
                  : isScheduled
                    ? "Voting opens soon"
                    : "Voting is not yet open"}
            </CardTitle>
            <CardDescription>
              {isPublished
                ? "You can view the final tally for this election on the public results page."
                : isClosed
                  ? "Ballot casting for this election is no longer available. Results will be published after review."
                  : isScheduled
                    ? "Check back shortly. The election will go live at the scheduled start time."
                    : "Election administrators are still preparing this election. Please check back later."}
            </CardDescription>
          </CardHeader>
          {isPublished && (
            <CardContent className="flex justify-center">
              <Button asChild>
                <a href={`/results/${electionId}`}>
                  View results
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Lookup card — only when LIVE */}
      {isLive && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
        >
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-1.5">
              <CardTitle className="text-lg">Verify your identity</CardTitle>
              <CardDescription>
                Enter the identifier your institution registered you with.
                We&apos;ll send a one-time code to confirm it&apos;s you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="lookup" className="text-sm font-medium">
                    Voter ID, email, phone or matric number
                  </Label>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="lookup"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="e.g. UNIZIK/2020/1000 or you@unizik.edu.ng"
                      className="h-12 pl-9 text-base"
                      value={lookup}
                      onChange={(e) => setLookup(e.target.value)}
                      disabled={submitting}
                      aria-describedby="lookup-help"
                    />
                  </div>
                  <p
                    id="lookup-help"
                    className="text-xs text-muted-foreground"
                  >
                    Use any of: your voter ID, registered email, phone number,
                    or matric number.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || !lookup.trim()}
                  className="h-12 w-full text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending code…
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5 text-primary" />
                <span>
                  Encrypted in transit · We never store your code in plain
                  text.
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* How voting works */}
      <Card className="border-border/60 bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-base">How voting works</CardTitle>
          <CardDescription className="sr-only">
            Four steps from verification to your tamper-evident receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FLOW_STEPS.map((s, idx) => (
              <li
                key={s.label}
                className="flex flex-col items-start gap-2 rounded-lg border border-border/60 bg-background p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <s.icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Tamper-evident receipts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="size-3.5 text-primary" />
          Anonymous ballot storage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Vote className="size-3.5 text-primary" />
          One voter, one ballot
        </span>
      </div>
    </div>
  );
}

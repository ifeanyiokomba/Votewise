"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  ShieldCheck,
  LockKeyhole,
  EyeOff,
  Vote,
  Home,
  AlertCircle,
  Info,
  ReceiptText,
  Award,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VoterProgress } from "@/components/shared/voter-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function ReceiptPage() {
  return (
    <Suspense fallback={<ReceiptSkeleton />}>
      <ReceiptInner />
    </Suspense>
  );
}

function ReceiptSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mx-auto h-12 w-12 rounded-full" />
      <Skeleton className="mx-auto h-8 w-56" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

function ReceiptInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const electionId = params.id;
  const reference = search.get("reference");
  const alreadyVoted = search.get("alreadyVoted") === "1";
  const countParam = search.get("count");
  const count = countParam ? Number(countParam) : NaN;

  const [copied, setCopied] = React.useState(false);
  const reduce = useReducedMotion();

  function copyReference() {
    if (!reference) return;
    void navigator.clipboard.writeText(reference);
    setCopied(true);
    toast.success("Reference copied", {
      description: "Keep this somewhere safe — you can use it to verify your ballot later.",
    });
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      <VoterProgress current="receipt" />

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-accent/40 to-background p-8 text-center dark:from-emerald-950/30 dark:via-accent/20"
      >
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 translate-y-6 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-col items-center">
          <div
            className={cn(
              "grid size-16 place-items-center rounded-full shadow-glow",
              alreadyVoted
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {alreadyVoted ? (
              <Info className="size-8" />
            ) : (
              <CheckCircle2 className="size-8" />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {alreadyVoted
              ? "You have already voted"
              : "Your vote has been recorded"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            {alreadyVoted
              ? "A ballot was already cast from your account in this election. You cannot vote again."
              : "Thank you for participating. Your selections have been securely recorded."}
          </p>
        </div>
      </motion.div>

      {reference && !alreadyVoted && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
        >
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <ReceiptText className="size-4 text-primary" />
                Your ballot reference
              </CardTitle>
              <CardDescription>
                Save this reference. You can use it to confirm your ballot
                was received — but it cannot reveal who you voted for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center">
                <code className="block break-all font-mono text-lg font-bold tracking-wider text-primary sm:text-xl">
                  {reference}
                </code>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={copyReference} variant="outline" size="lg">
                  {copied ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy reference
                    </>
                  )}
                </Button>
                <Button asChild size="lg">
                  <a
                    href={`/verify-ballot?reference=${encodeURIComponent(
                      reference
                    )}`}
                  >
                    <ShieldCheck className="size-4" />
                    Verify your ballot
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a
                    href={`/certificate/${encodeURIComponent(reference)}`}
                    target="_blank"
                    rel="noopener"
                  >
                    <Award className="size-4" />
                    Get certificate
                  </a>
                </Button>
              </div>

              {!Number.isNaN(count) && count > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {count} {count === 1 ? "selection" : "selections"} recorded
                  on this ballot.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Ballot secrecy explainer */}
      <Card className="border-border/60 bg-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LockKeyhole className="size-4 text-primary" />
            How your privacy is protected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold">Anonymous ballot.</strong>{" "}
                Your selections are stored against a one-time anonymous token,
                not your name or contact.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold">Receipt only confirms receipt.</strong>{" "}
                This reference proves your ballot was received — it cannot
                reveal who you voted for.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold">Tamper-evident.</strong>{" "}
                Every ballot is hashed at cast time. Any tampering is
                detectable in the audit trail.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {alreadyVoted && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            One voter, one ballot
          </AlertTitle>
          <AlertDescription>
            Each voter may only cast one ballot per election. If you believe
            this is an error, contact your election administrator.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="outline" size="lg">
          <a href={`/results/${electionId}`}>
            <Vote className="size-4" />
            View election results
          </a>
        </Button>
        <Button asChild size="lg">
          <a href="/">
            <Home className="size-4" />
            Done
          </a>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Ballot cast {formatDate(new Date())}
      </p>
    </div>
  );
}

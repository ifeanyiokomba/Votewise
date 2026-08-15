"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ReceiptText,
  ArrowRight,
  KeyRound,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
import { cn, formatDate } from "@/lib/utils";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type VerifyResponse = {
  verified: boolean;
  reference: string;
  timestamp: string | null;
};

export default function VerifyBallotPage() {
  return (
    <Suspense fallback={<VerifySkeleton />}>
      <VerifyBallotInner />
    </Suspense>
  );
}

function VerifySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="mx-auto h-8 w-56" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

function VerifyBallotInner() {
  const search = useSearchParams();
  const initial = search.get("reference") ?? "";

  const [reference, setReference] = React.useState(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<VerifyResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reduce = useReducedMotion();

  const doVerify = React.useCallback(
    async (value?: string) => {
      const ref = (value ?? reference).trim();
      if (!ref) {
        setError("Enter your ballot reference first.");
        return;
      }
      setError(null);
      setSubmitting(true);
      setResult(null);
      const res = await apiFetch<VerifyResponse>("/api/public/verify-ballot", {
        method: "POST",
        body: JSON.stringify({ reference: ref }),
      });
      setSubmitting(false);
      if (!res.success || !res.data) {
        const msg = res.error?.message ?? "Couldn't verify this reference.";
        setError(msg);
        toast.error("Verification failed", { description: msg });
        return;
      }
      setResult(res.data);
      if (res.data.verified) {
        toast.success("Ballot verified", {
          description: "Your ballot was received and recorded.",
        });
      } else {
        toast.error("Not verified", {
          description: "We couldn't find a matching ballot.",
        });
      }
    },
    [reference]
  );

  // Auto-submit if pre-filled via query (e.g., from receipt page)
  React.useEffect(() => {
    if (initial) {
      setReference(initial);
      // Defer to next tick so the input has the value
      const t = setTimeout(() => void doVerify(initial), 100);
      return () => clearTimeout(t);
    }
  }, [initial, doVerify]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Verify a ballot
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          Enter the reference number you received after casting your vote. We&apos;ll
          confirm your ballot was received — without revealing your selections.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-primary" />
            Ballot reference
          </CardTitle>
          <CardDescription>
            Paste the full reference (it starts with{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              VOTEREC_
            </code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doVerify();
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="reference" className="sr-only">
                Ballot reference
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="VOTEREC_…"
                  className="h-12 pl-9 font-mono text-base"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base"
              disabled={submitting || !reference.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  Verify ballot
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.verified ? "verified" : "unverified"}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card
              className={cn(
                "border-2",
                result.verified
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5"
              )}
            >
              <CardHeader className="items-center text-center">
                <div
                  className={cn(
                    "grid size-14 place-items-center rounded-full",
                    result.verified
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  {result.verified ? (
                    <CheckCircle2 className="size-8" />
                  ) : (
                    <XCircle className="size-8" />
                  )}
                </div>
                <CardTitle className="text-xl">
                  {result.verified
                    ? "Ballot verified"
                    : "Reference not found"}
                </CardTitle>
                <CardDescription>
                  {result.verified
                    ? "We confirmed a ballot was received with this reference."
                    : "We couldn't find a ballot matching this reference. Check the reference and try again."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reference
                  </div>
                  <code className="mt-1 block break-all font-mono text-sm font-semibold text-foreground">
                    {result.reference}
                  </code>
                </div>

                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock className="size-3.5" />
                    Timestamp
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {result.timestamp
                      ? formatDate(result.timestamp)
                      : "—"}
                  </div>
                </div>

                {result.verified && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <p>
                        Verification confirms your ballot was received. It
                        does not reveal who you voted for — your selections are
                        stored anonymously.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper / privacy note */}
      <Card className="border-border/60 bg-secondary/30">
        <CardContent className="flex items-start gap-2 py-4 text-sm">
          <ReceiptText className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Lost your reference?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your reference was shown on the receipt page right after you cast
              your vote. Without it, we cannot look up your specific ballot —
              this protects voter privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="sm">
          <a href="/">
            Back to home
            <ArrowRight className="size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  Mail,
  Smartphone,
  RefreshCw,
  ChevronLeft,
  Info,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { VoterProgress } from "@/components/shared/voter-progress";
import { SupportChatWidget } from "@/components/shared/support-chat-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

type Channel = "EMAIL" | "SMS" | "WHATSAPP";

type SendResponse =
  | {
      sent: boolean;
      attemptsRemaining?: number;
      voterId: string;
      channel?: Channel;
      devCode?: string;
    }
  | { alreadyVoted: true; voterId: string };

type VerifyResponse =
  | { verified: true; voterId: string }
  | { verified: false; error?: string; voterId?: string };

const RESEND_SECONDS = 60;

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifySkeleton />}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function VerifyInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const electionId = params.id;

  const voterIdFromQuery = search.get("voterId");
  const channelFromQuery = search.get("channel") as Channel | null;

  const [voterId, setVoterId] = React.useState<string | null>(
    voterIdFromQuery ?? null
  );
  const [channel, setChannel] = React.useState<Channel | null>(
    channelFromQuery ?? null
  );
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [sending, setSending] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [redirecting, setRedirecting] = React.useState(false);
  const [alreadyVoted, setAlreadyVoted] = React.useState(false);

  const reduce = useReducedMotion();
  const isProd = process.env.NODE_ENV === "production";
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // If no voterId in query, fall back to sessionStorage, else redirect back.
  React.useEffect(() => {
    if (voterId) return;
    try {
      const raw = sessionStorage.getItem(`votewise:voter:${electionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          voterId?: string;
          channel?: Channel;
        };
        if (parsed.voterId) {
          setVoterId(parsed.voterId);
          if (parsed.channel && !channel) setChannel(parsed.channel);
          return;
        }
      }
    } catch {
      // ignore
    }
    // No voterId — back to landing.
    router.replace(`/vote/${electionId}`);
  }, [voterId, electionId, channel, router]);

  const startResendCountdown = React.useCallback(() => {
    setResendIn(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((n) => {
        if (n <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }, []);

  const sendOtp = React.useCallback(
    async (silent = false) => {
      if (!voterId) return;
      if (!silent) setSending(true);
      setError(null);
      const res = await apiFetch<SendResponse>("/api/voter/verify", {
        method: "POST",
        body: JSON.stringify({ electionId, voterId, channel }),
      });
      // Always clear the sending state once the request resolves, so the
      // silent mount resend doesn't leave the page stuck on "Sending…".
      setSending(false);

      if (!res.success || !res.data) {
        const msg = res.error?.message ?? "Could not send code. Try again.";
        if (!silent) setError(msg);
        return;
      }

      const data = res.data;
      if ("alreadyVoted" in data && data.alreadyVoted) {
        setAlreadyVoted(true);
        toast.info("Already voted", {
          description: "A ballot has already been cast from your account.",
        });
        router.replace(
          `/vote/${electionId}/receipt?alreadyVoted=1&voterId=${encodeURIComponent(
            data.voterId
          )}`
        );
        return;
      }

      if (data.sent === false) {
        if (!silent)
          setError(
            "Too many code requests. Please wait a minute and try again."
          );
        return;
      }

      if (data.channel) setChannel(data.channel);
      if (data.devCode) setDevCode(data.devCode);
      startResendCountdown();
      if (!silent) toast.success("Code sent", { description: "Check your inbox or messages." });
    },
    [voterId, electionId, router, startResendCountdown, channel]
  );

  // (Re)send OTP on mount so this page is self-sufficient for QA.
  React.useEffect(() => {
    if (!voterId) return;
    void sendOtp(true);
  }, [voterId, sendOtp]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!voterId) return;
    if (code.length < 6) {
      setError("Enter all 6 digits.");
      triggerShake();
      return;
    }
    setVerifying(true);
    setError(null);
    const res = await apiFetch<VerifyResponse>("/api/voter/verify", {
      method: "POST",
      body: JSON.stringify({ electionId, voterId, code }),
    });
    setVerifying(false);

    if (!res.success || !res.data) {
      const msg = res.error?.message ?? "Verification failed. Try again.";
      setError(msg);
      triggerShake();
      return;
    }
    const data = res.data;
    if (data.verified) {
      setRedirecting(true);
      toast.success("Verified", {
        description: "Loading your ballot…",
      });
      router.push(
        `/vote/${electionId}/ballot?voterId=${encodeURIComponent(voterId)}`
      );
      return;
    }
    setError(
      data.error ?? "Invalid or expired code. Please try again."
    );
    triggerShake();
  }

  function triggerShake() {
    if (reduce) return;
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  if (!voterId) {
    return <VerifySkeleton />;
  }

  if (redirecting) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading your ballot…
        </p>
      </div>
    );
  }

  const channelLabel =
    channel === "SMS"
      ? "phone"
      : channel === "WHATSAPP"
        ? "WhatsApp"
        : "email";

  const ChannelIcon = channel === "SMS" || channel === "WHATSAPP" ? Smartphone : Mail;

  return (
    <div className="space-y-6">
      <VoterProgress current="verify" />

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Enter your verification code
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          For your security, we sent a one-time 6-digit code to confirm your
          identity.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {sending ? (
          <motion.div
            key="sending"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-border/70">
              <CardContent className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Sending your code…
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              x: shake ? [0, -8, 8, -6, 6, -3, 0] : 0,
            }}
            transition={{
              opacity: { duration: 0.35 },
              x: { duration: shake ? 0.45 : 0 },
            }}
          >
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center justify-center gap-2 text-center text-base">
                  <ChannelIcon className="size-4 text-primary" />
                  Code sent via {channelLabel}
                </CardTitle>
                <CardDescription className="text-center">
                  {channel === "EMAIL"
                    ? "Check your email inbox (and spam folder) for the code."
                    : channel === "SMS" || channel === "WHATSAPP"
                      ? "Check your phone messages for the code."
                      : "Check the channel you registered with."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={onVerify} className="space-y-5" noValidate>
                  <div className="flex flex-col items-center gap-2">
                    <Label htmlFor="otp" className="sr-only">
                      6-digit verification code
                    </Label>
                    <InputOTP
                      id="otp"
                      maxLength={6}
                      value={code}
                      onChange={(v) => {
                        setError(null);
                        setCode(v);
                      }}
                      disabled={verifying}
                      containerClassName="justify-center"
                      autoFocus
                      inputMode="numeric"
                      aria-label="6-digit verification code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="size-12 text-lg first:rounded-l-md"
                        />
                        <InputOTPSlot
                          index={1}
                          className="size-12 text-lg"
                        />
                        <InputOTPSlot
                          index={2}
                          className="size-12 text-lg last:rounded-r-md"
                        />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={3}
                          className="size-12 text-lg first:rounded-l-md"
                        />
                        <InputOTPSlot
                          index={4}
                          className="size-12 text-lg"
                        />
                        <InputOTPSlot
                          index={5}
                          className="size-12 text-lg last:rounded-r-md"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-muted-foreground">
                      The code expires in 10 minutes.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full text-base"
                    disabled={verifying || code.length < 6}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      "Verify & continue"
                    )}
                  </Button>
                </form>

                <div className="mt-5 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => router.push(`/vote/${electionId}`)}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    <ChevronLeft className="size-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendOtp(false)}
                    disabled={resendIn > 0 || verifying}
                    className="inline-flex items-center gap-1.5 font-medium text-primary transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:underline"
                  >
                    <RefreshCw className="size-3.5" />
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </div>

                {/* Channel switcher — voter can choose different channel for resend */}
                {resendIn === 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Resend via:</span>
                    <button
                      type="button"
                      onClick={() => { setChannel("EMAIL"); void sendOtp(false); }}
                      disabled={verifying}
                      className="rounded-md border px-2 py-0.5 font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChannel("SMS"); void sendOtp(false); }}
                      disabled={verifying}
                      className="rounded-md border px-2 py-0.5 font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChannel("WHATSAPP"); void sendOtp(false); }}
                      disabled={verifying}
                      className="rounded-md border px-2 py-0.5 font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      WhatsApp
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev hint — QA affordance only, hidden in production builds */}
      {!isProd && devCode && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="size-4" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            Dev mode — your verification code
          </AlertTitle>
          <AlertDescription>
            <p className="text-amber-800 dark:text-amber-300">
              No real SMS/email provider is wired up in this environment. Use
              this code to complete the flow:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-md bg-amber-100 px-3 py-1.5 font-mono text-lg font-bold tracking-[0.3em] text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                {devCode}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-300 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                onClick={() => {
                  void navigator.clipboard.writeText(devCode);
                  toast.success("Code copied");
                }}
              >
                Copy
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Security note */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        <span>
          Votewise will never ask for your code over the phone or by email.
        </span>
      </div>

      {/* Floating support chat — voter can talk to AI or live agent */}
      {voterId && (
        <SupportChatWidget
          electionId={electionId}
          voter={{ voterId, voterName: `Voter ${voterId.slice(-6)}`, electionId }}
        />
      )}
    </div>
  );
}

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
  Sparkles,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { VoterProgress } from "@/components/shared/voter-progress";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { SupportChatWidget } from "@/components/shared/support-chat-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, ShieldAlert, Upload } from "lucide-react";

type ElectionPublicInfo =
  | {
      published: false;
      status: string;
      electionName: string;
      electionId: string;
      voterTemplate?: string;
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
      voterTemplate?: string;
    };

const TEMPLATE_STYLES: Record<
  string,
  { heroGradient: string; heroRing: string; bgAccent: string; headingClass: string; ctaClass: string }
> = {
  classic: {
    heroGradient: "from-primary/5 via-accent/30 to-background",
    heroRing: "bg-primary/10",
    bgAccent: "bg-primary/10",
    headingClass: "tracking-tight",
    ctaClass: "",
  },
  modern: {
    heroGradient: "from-fuchsia-500/10 via-pink-500/5 to-violet-500/10",
    heroRing: "bg-fuchsia-500/15",
    bgAccent: "bg-fuchsia-500/10",
    headingClass: "tracking-tight bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent",
    ctaClass: "bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700",
  },
  editorial: {
    heroGradient: "from-amber-500/10 via-orange-500/5 to-red-500/10",
    heroRing: "bg-amber-500/15",
    bgAccent: "bg-amber-500/10",
    headingClass: "font-serif tracking-tight",
    ctaClass: "bg-amber-700 hover:bg-amber-800",
  },
  minimal: {
    heroGradient: "from-zinc-100 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-black",
    heroRing: "bg-zinc-300 dark:bg-zinc-700",
    bgAccent: "bg-zinc-200 dark:bg-zinc-800",
    headingClass: "tracking-tight font-light",
    ctaClass: "",
  },
  regal: {
    heroGradient: "from-amber-900/20 via-zinc-900/30 to-amber-900/10 dark:from-amber-900/40 dark:via-black dark:to-amber-950/40",
    heroRing: "bg-amber-500/20",
    bgAccent: "bg-amber-500/10",
    headingClass: "tracking-tight text-amber-700 dark:text-amber-400 font-serif",
    ctaClass: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-amber-950",
  },
  civic: {
    heroGradient: "from-sky-700/10 via-blue-700/5 to-indigo-800/10",
    heroRing: "bg-sky-700/15",
    bgAccent: "bg-sky-700/10",
    headingClass: "tracking-tight text-sky-800 dark:text-sky-300",
    ctaClass: "bg-sky-800 hover:bg-sky-900",
  },
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
  const [showPhotoPrompt, setShowPhotoPrompt] = React.useState(false);
  const [photoVerified, setPhotoVerified] = React.useState(false);
  const [pendingVoterId, setPendingVoterId] = React.useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [voterInfo, setVoterInfo] = React.useState<{ voterId: string; voterName: string } | null>(null);

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

      // Handle already-voted
      if ("alreadyVoted" in data && data.alreadyVoted) {
        toast.info("Already voted", {
          description: "A ballot was already cast from your account.",
        });
        router.push(
          `/vote/${electionId}/receipt?alreadyVoted=1&voterId=${encodeURIComponent(
            data.voterId
          )}`
        );
        return;
      }

      if (data.sent === false) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }

      // ─── Device fingerprint check ───
      // Check if this device has been used by another voter in this election
      if (!photoVerified && data.voterId) {
        const fingerprint = {
          userAgent: navigator.userAgent,
          screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
        };

        const deviceRes = await apiFetch<{ requirePhoto: boolean }>("/api/voter/device-check", {
          method: "POST",
          body: JSON.stringify({ electionId, voterId: data.voterId, fingerprint }),
        });

        if (deviceRes.success && deviceRes.data?.requirePhoto) {
          // Device seen before — require a live photo before proceeding.
          // No reason is given to the voter, per spec.
          setPendingVoterId(data.voterId);
          setShowPhotoPrompt(true);
          setSubmitting(false);

          // Store voter info for after photo verification
          try {
            sessionStorage.setItem(
              `votewise:voter:${electionId}`,
              JSON.stringify({ voterId: data.voterId, channel: data.channel, ts: Date.now() })
            );
          } catch { /* ignore */ }

          setVoterInfo({ voterId: data.voterId, voterName: `Voter ${data.voterId.slice(-6)}` });
          // OTP has already been sent — but do NOT navigate yet. The voter
          // must upload a live photo before being allowed to proceed to the
          // verify page. See handlePhotoUpload() below.
          return;
        }
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

      setVoterInfo({ voterId: data.voterId, voterName: `Voter ${data.voterId.slice(-6)}` });

      const params = new URLSearchParams({
        voterId: data.voterId,
      });
      if (data.channel) params.set("channel", data.channel);
      router.push(`/vote/${electionId}/verify?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!pendingVoterId) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("voterId", pendingVoterId);
      formData.append("electionId", electionId);
      formData.append("reason", "device_reuse_verification");
      const res = await fetch("/api/support/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPhotoVerified(true);
        setShowPhotoPrompt(false);
        toast.success("Verification complete", {
          description: "You can now continue to enter your one-time code.",
        });
        // Now navigate to the verify page (OTP was already sent earlier)
        const voterData = sessionStorage.getItem(`votewise:voter:${electionId}`);
        const channel = voterData ? (JSON.parse(voterData).channel ?? undefined) : undefined;
        const params = new URLSearchParams({ voterId: pendingVoterId });
        if (channel) params.set("channel", channel);
        router.push(`/vote/${electionId}/verify?${params.toString()}`);
      } else {
        setPhotoError(data.error?.message ?? "Upload failed. Please try again.");
      }
    } catch {
      setPhotoError("Network error. Please check your connection and try again.");
    } finally {
      setPhotoUploading(false);
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

      {/* Election announcements from admin */}
      <AnnouncementBanner electionId={electionId} />

      {/* Hero — themed by org's chosen voter template */}
      {(() => {
        const tplId = (info.published ? info.voterTemplate : info.voterTemplate) ?? "classic";
        const tpl = TEMPLATE_STYLES[tplId] ?? TEMPLATE_STYLES.classic;
        return (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tpl.heroGradient} p-6 text-center sm:p-8`}
          >
            <div className={`absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full ${tpl.heroRing} blur-3xl`} />
            <div className="absolute bottom-0 left-1/4 h-24 w-24 translate-y-6 rounded-full bg-chart-2/10 blur-3xl" />
            <div className="relative">
              <div className="mb-3 flex justify-center">
                <StatusBadge status={status} className="text-sm" />
              </div>
              <h1 className={`text-balance text-2xl font-bold leading-tight sm:text-3xl ${tpl.headingClass}`}>
                {electionName}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-balance text-sm text-muted-foreground sm:text-base">
                {isPublished
                  ? "This election has concluded and the results are now public."
                  : isLive
                    ? "Verify your identity to receive your ballot. Your vote is secret and your choices cannot be traced back to you."
                    : "Welcome. Voting for this election is not currently open."}
              </p>
              {tplId !== "classic" && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur">
                  <Sparkles className="size-3" /> {tplId.charAt(0).toUpperCase() + tplId.slice(1)} theme
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

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
      <Card className="overflow-hidden border-border/60 bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-base">How voting works</CardTitle>
          <CardDescription className="sr-only">
            Four steps from verification to your tamper-evident receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Connecting line on desktop */}
            <div className="absolute left-[12%] right-[12%] top-[22px] hidden h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 sm:block" aria-hidden />
            {FLOW_STEPS.map((s, idx) => (
              <li
                key={s.label}
                className="relative flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background p-4 text-center transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="relative grid size-10 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                  <s.icon className="size-5" />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                </div>
                <div className="mt-1">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Tamper-evident receipts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <LockKeyhole className="size-3.5 text-primary" />
          Anonymous ballot storage
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
          <Vote className="size-3.5 text-primary" />
          One voter, one ballot
        </span>
      </div>

      {/* ─── Photo verification prompt (device reuse) ─── */}
      <Dialog open={showPhotoPrompt} onOpenChange={(o) => { if (!o && !photoVerified) setShowPhotoPrompt(true); }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-amber-100 dark:bg-amber-950">
              <ShieldAlert className="size-7 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-center text-lg">Photo required</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Please take a photo to continue.
            </DialogDescription>
          </DialogHeader>

          {photoError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{photoError}</AlertDescription>
            </Alert>
          )}

          {photoVerified ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Verified — redirecting you to the verification page…
            </div>
          ) : (
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="gap-2"
                size="lg"
              >
                {photoUploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {photoUploading ? "Uploading…" : "Take photo with camera"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Allow file picker as fallback (gallery)
                  if (photoInputRef.current) {
                    photoInputRef.current.removeAttribute("capture");
                    photoInputRef.current?.click();
                  }
                }}
                disabled={photoUploading}
                className="gap-2"
                size="lg"
              >
                <Upload className="size-4" /> Upload from device
              </Button>
            </DialogFooter>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoUpload(f);
              e.target.value = "";
              // Restore capture attribute for next time
              setTimeout(() => photoInputRef.current?.setAttribute("capture", "user"), 100);
            }}
            className="hidden"
          />
        </DialogContent>
      </Dialog>

      {/* ─── Floating support chat (live + AI) ─── */}
      <SupportChatWidget electionId={electionId} voter={voterInfo ?? undefined} />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  Wallet,
  CreditCard,
  Handshake,
  CheckCircle2,
  Loader2,
  Receipt,
  Users,
  Tag,
  CircleDollarSign,
  Sparkles,
  ShieldCheck,
  Copy,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";
import type { CommercialActivationDTO } from "@/components/dashboard/types";

interface ActivationResponse {
  activation: CommercialActivationDTO;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  UNPRICED: { label: "Unpriced", tone: "bg-muted text-muted-foreground border-border" },
  PAYMENT_REQUIRED: { label: "Payment required", tone: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
  PAYMENT_PENDING: { label: "Payment pending", tone: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
  PAYMENT_VERIFIED: { label: "Payment verified", tone: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" },
  NEGOTIATION_REQUESTED: { label: "Negotiation requested", tone: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900" },
  NEGOTIATION_IN_PROGRESS: { label: "Negotiation in progress", tone: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900" },
  NEGOTIATED_SETTLEMENT_PENDING: { label: "Settlement pending", tone: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900" },
  MANUALLY_APPROVED: { label: "Manually approved", tone: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" },
  DECLINED: { label: "Declined", tone: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface PayResponse {
  payment: { reference: string; amount: number; status: string };
}

export default function ActivatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [activation, setActivation] = useState<CommercialActivationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ reference: string; amount: number } | null>(null);

  // Negotiation form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [proposedAmount, setProposedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [negotiationSent, setNegotiationSent] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

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
    const res = await apiFetch<ActivationResponse>(
      `/api/elections/${electionId}/activation`
    );
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load activation");
      return;
    }
    setActivation(res.data.activation);
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

  async function pay() {
    if (!electionId) return;
    setPaying(true);
    const res = await apiFetch<PayResponse>(
      `/api/elections/${electionId}/activation/pay`,
      { method: "POST" }
    );
    setPaying(false);
    setPayOpen(false);
    if (!res.success || !res.data?.payment) {
      toast.error("Payment failed", { description: res.error?.message });
      return;
    }
    setPaymentResult({
      reference: res.data.payment.reference,
      amount: res.data.payment.amount,
    });
    toast.success("Payment received!", {
      description: `Reference: ${res.data.payment.reference}`,
    });
    setShowCelebration(true);
    load();
  }

  async function submitNegotiation(e: React.FormEvent) {
    e.preventDefault();
    if (!electionId) return;
    if (contactName.trim().length < 2) {
      toast.error("Contact name is too short");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error("Enter a valid email");
      return;
    }
    setSubmitting(true);
    const body = {
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,
      message: message.trim() || null,
      proposedAmount: proposedAmount ? Number(proposedAmount) : null,
    };
    const res = await apiFetch<{ negotiation: unknown }>(
      `/api/elections/${electionId}/activation/negotiate`,
      { method: "POST", body: JSON.stringify(body) }
    );
    setSubmitting(false);
    if (!res.success) {
      toast.error("Could not submit request", { description: res.error?.message });
      return;
    }
    toast.success("Negotiation request sent", {
      description: "Our team will reach out within one business day.",
    });
    setNegotiationSent(true);
    load();
  }

  const isVerified = activation?.status === "PAYMENT_VERIFIED" || activation?.status === "MANUALLY_APPROVED";

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="activate">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Activation</h2>
            <p className="text-sm text-muted-foreground">
              Paid-plan elections require activation before going LIVE. Choose to pay the standard rate or request a negotiation.
            </p>
          </div>
          {activation && (
            <Badge
              variant="outline"
              className={cn("text-xs", STATUS_LABELS[activation.status]?.tone ?? STATUS_LABELS.UNPRICED.tone)}
            >
              {STATUS_LABELS[activation.status]?.label ?? activation.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : activation ? (
          <>
            {/* Already activated state */}
            {isVerified && (
              <Card className="overflow-hidden border-primary/30 bg-primary/5">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Election activated</p>
                    <p className="text-xs text-muted-foreground">
                      This election is cleared to go LIVE. Head back to Overview and transition to LIVE.
                    </p>
                  </div>
                  {activation.activatedAt && (
                    <Badge variant="outline" className="text-[10px]">
                      <ShieldCheck className="h-3 w-3" />
                      Activated {new Date(activation.activatedAt).toLocaleDateString()}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Pricing summary */}
              <Card className="lg:col-span-1">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4 text-primary" />
                    Pricing summary
                  </CardTitle>
                  <CardDescription>Per-voter rate · snapshot at quote time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <Row
                    icon={Users}
                    label="Eligible voters"
                    value={formatNumber(activation.voterCount)}
                  />
                  <Row
                    icon={Tag}
                    label="Applicable rate"
                    value={`${formatCurrency(activation.applicableRate, activation.currency)} / voter`}
                  />
                  <Row
                    icon={Sparkles}
                    label="Pricing rule"
                    value={
                      <Badge variant="outline" className="text-[10px]">
                        {activation.pricingRule}
                      </Badge>
                    }
                  />
                  <Separator />
                  <Row
                    icon={CircleDollarSign}
                    label="Total amount"
                    value={
                      <span className="text-lg font-bold tabular-nums">
                        {formatCurrency(activation.calculatedAmount, activation.currency)}
                      </span>
                    }
                    highlight
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Bulk pricing applies above 2,000 voters (₦300/voter instead of ₦400/voter).
                  </p>
                </CardContent>
              </Card>

              {/* Action panel */}
              <Card className="lg:col-span-2">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-base">Choose activation path</CardTitle>
                  <CardDescription>
                    {isVerified
                      ? "This election is already activated — no further action needed."
                      : "Pay now or request a custom quote. Both paths unlock LIVE."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {paymentResult ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-3 py-6 text-center"
                    >
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Payment confirmed</p>
                        <p className="text-sm text-muted-foreground">
                          Your election is now activated and ready to go LIVE.
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{paymentResult.reference}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPaymentResult(null)}>
                        Dismiss
                      </Button>
                    </motion.div>
                  ) : negotiationSent ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-3 py-6 text-center"
                    >
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                        <Handshake className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">Negotiation request sent</p>
                        <p className="text-sm text-muted-foreground">
                          Our team will reach out to <span className="font-medium">{contactEmail}</span> within one business day.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNegotiationSent(false);
                          setContactName("");
                          setContactEmail("");
                          setContactPhone("");
                          setMessage("");
                          setProposedAmount("");
                        }}
                      >
                        Submit another
                      </Button>
                    </motion.div>
                  ) : isVerified ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 text-primary" />
                      No further activation action required.
                    </div>
                  ) : (
                    <Tabs defaultValue="pay">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pay">
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay &amp; activate
                        </TabsTrigger>
                        <TabsTrigger value="negotiate">
                          <Handshake className="h-3.5 w-3.5" />
                          Request negotiation
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="pay" className="mt-4 space-y-4">
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">
                            You will be charged
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {formatCurrency(activation.calculatedAmount, activation.currency)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            for {formatNumber(activation.voterCount)} eligible voters at{" "}
                            {formatCurrency(activation.applicableRate, activation.currency)}/voter
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => setPayOpen(true)}
                          disabled={!activation || activation.voterCount === 0}
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay {formatCurrency(activation.calculatedAmount, activation.currency)} &amp; activate
                        </Button>
                        {activation.voterCount === 0 && (
                          <p className="text-center text-xs text-muted-foreground">
                            Add eligible voters before activating — pricing is per voter.
                          </p>
                        )}
                        <p className="text-center text-[11px] text-muted-foreground">
                          <ShieldCheck className="mr-1 inline h-3 w-3" />
                          Payments are processed securely. A receipt with a verifiable reference is issued instantly.
                        </p>
                      </TabsContent>

                      <TabsContent value="negotiate" className="mt-4">
                        <form onSubmit={submitNegotiation} className="grid gap-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label htmlFor="neg-name">Contact name *</Label>
                              <Input
                                id="neg-name"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="e.g. Adaeze Okafor"
                                required
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="neg-email">Contact email *</Label>
                              <Input
                                id="neg-email"
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="finance@unizik.edu.ng"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label htmlFor="neg-phone">Phone</Label>
                              <Input
                                id="neg-phone"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="+234 801 234 5678"
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="neg-amount">Proposed amount (NGN)</Label>
                              <Input
                                id="neg-amount"
                                type="number"
                                value={proposedAmount}
                                onChange={(e) => setProposedAmount(e.target.value)}
                                placeholder={String(activation.calculatedAmount)}
                                min={0}
                              />
                            </div>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="neg-message">Message</Label>
                            <Textarea
                              id="neg-message"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              rows={4}
                              placeholder="Tell us about your event, expected voter count, timeline, budget constraints…"
                            />
                          </div>
                          <Button type="submit" size="lg" disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                              </>
                            ) : (
                              <>
                                <Handshake className="h-4 w-4" /> Submit request
                              </>
                            )}
                          </Button>
                          <p className="text-center text-[11px] text-muted-foreground">
                            Standard rate:{" "}
                            <span className="font-medium">
                              {formatCurrency(activation.calculatedAmount, activation.currency)}
                            </span>{" "}
                            · You can propose a lower amount and we&apos;ll respond within one business day.
                          </p>
                        </form>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>

      <AlertDialog open={payOpen} onOpenChange={setPayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Confirm payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activation && (
                <>
                  You are about to pay{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(activation.calculatedAmount, activation.currency)}
                  </span>{" "}
                  for {formatNumber(activation.voterCount)} eligible voters. A receipt with a verifiable
                  reference will be issued instantly. The election will be marked as activated.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                pay();
              }}
              disabled={paying}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Pay now
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Celebratory Activation Window ─── */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-lg">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex flex-col items-center py-6 text-center"
          >
            {/* Celebration animation */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
              className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-glow"
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight">Election Activated! 🎉</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your election is now activated and ready to go live. Share the voting link below with your voters.
            </p>

            {/* Subdomain link */}
            <div className="mt-6 w-full">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Voter voting link
              </Label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
                <code className="flex-1 truncate text-sm font-medium">
                  {typeof window !== "undefined" ? `${window.location.origin}/vote/${electionId}` : `/vote/${electionId}`}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(`${window.location.origin}/vote/${electionId}`);
                      toast.success("Link copied!", { description: "Share this with your voters." });
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Org homepage link */}
            {activation?.organizationId && (
              <div className="mt-3 w-full">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Organization homepage
                </Label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
                  <code className="flex-1 truncate text-sm font-medium">
                    {typeof window !== "undefined" ? `${window.location.origin}/org/${activation.electionId}` : ""}
                  </code>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Payment reference: <span className="font-mono font-semibold">{paymentResult?.reference}</span>
            </p>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setShowCelebration(false)}>
                Close
              </Button>
              <Button asChild>
                <a href={`/vote/${electionId}`} target="_blank" rel="noopener">
                  Go to election
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </ElectionShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2",
        highlight ? "bg-primary/5" : "bg-muted/30"
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

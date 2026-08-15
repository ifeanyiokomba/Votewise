"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { ColoredBadge } from "@/components/dashboard/colored-badge";
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard,
  Check,
  Loader2,
  Sparkles,
  TrendingUp,
  Calendar,
  X,
} from "lucide-react";
import { SUBSCRIPTION_PLANS, PRICING_CONFIG } from "@/lib/constants";
import type { MeResponse } from "@/components/dashboard/types";

interface PaymentDTO {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  paidAt: string | null;
  createdAt: string;
}

interface SubscriptionDTO {
  id: string;
  organizationId: string;
  tier: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentDTO[];
}

const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

function formatPrice(price: number): string {
  if (price < 0) return "Custom";
  if (price === 0) return "Free";
  return formatCurrency(price);
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDTO | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("FREE");
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [subRes, meRes] = await Promise.all([
      apiFetch<{ subscription: SubscriptionDTO | null }>("/api/admin/subscription"),
      apiFetch<MeResponse>("/api/auth/me"),
    ]);
    setLoading(false);
    if (!subRes.success) {
      setError(subRes.error?.message ?? "Could not load subscription");
      return;
    }
    setSubscription(subRes.data?.subscription ?? null);
    if (meRes.success && meRes.data?.organization) {
      setCurrentTier(meRes.data.organization.subscriptionTier);
    }
  }, []);

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

  async function upgrade(tier: string) {
    setUpgradingTier(tier);
    const res = await apiFetch<{ subscription: SubscriptionDTO }>(
      "/api/admin/subscription/upgrade",
      {
        method: "POST",
        body: JSON.stringify({ tier }),
      }
    );
    setUpgradingTier(null);
    if (!res.success || !res.data) {
      toast.error(`Could not upgrade to ${TIER_LABELS[tier] ?? tier}`, {
        description: res.error?.message,
      });
      return;
    }
    setSubscription(res.data.subscription);
    setCurrentTier(tier);
    toast.success(`Upgraded to ${TIER_LABELS[tier] ?? tier}`, {
      description: "Your subscription is now active.",
    });
  }

  async function cancel() {
    setCancelling(true);
    const res = await apiFetch<{ cancelled: boolean }>(
      "/api/admin/subscription/cancel",
      { method: "POST" }
    );
    setCancelling(false);
    setCancelOpen(false);
    if (!res.success || !res.data) {
      toast.error("Could not cancel subscription", {
        description: res.error?.message,
      });
      return;
    }
    if (res.data.cancelled) {
      setSubscription((prev) =>
        prev ? { ...prev, isActive: false, endDate: new Date().toISOString() } : prev
      );
      setCurrentTier("FREE");
      toast.success("Subscription cancelled", {
        description: "Your plan reverted to the Free tier.",
      });
    } else {
      toast.info("No active subscription to cancel");
    }
  }

  const active = subscription?.isActive ?? false;
  const payments = subscription?.payments ?? [];

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Subscription"
        title="Subscription & billing"
        description="Manage your plan, payment history, and per-voter pricing for activations."
      />

      {/* Current plan */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardDescription>Current plan</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                {TIER_LABELS[currentTier] ?? currentTier}
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ColoredBadge
                  value={active ? "ACTIVE" : "INACTIVE"}
                  tone={active ? "success" : "neutral"}
                  pulse={active}
                />
                {currentTier !== "FREE" && !active && (
                  <span className="text-xs text-muted-foreground">
                    Plan expired
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium">
                  {subscription?.startDate
                    ? formatDate(subscription.startDate)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Renews / ends</span>
                <span className="font-medium">
                  {subscription?.endDate
                    ? formatDate(subscription.endDate)
                    : "—"}
                </span>
              </div>
              {subscription?.paymentRef && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment ref</span>
                  <span className="font-mono text-xs">{subscription.paymentRef}</span>
                </div>
              )}
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Plan limits
                </p>
                {(() => {
                  const p = SUBSCRIPTION_PLANS.find((x) => x.id === currentTier);
                  if (!p) return null;
                  return (
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {p.maxVoters === -1
                          ? "Unlimited voters"
                          : `Up to ${p.maxVoters.toLocaleString()} voters`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {p.maxElections === -1
                          ? "Unlimited elections"
                          : `Up to ${p.maxElections} active elections`}
                      </li>
                    </ul>
                  );
                })()}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              {currentTier !== "FREE" && active && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                  disabled={cancelling}
                >
                  <X className="h-4 w-4" />
                  Cancel subscription
                </Button>
              )}
              {currentTier === "FREE" && (
                <p className="text-center text-xs text-muted-foreground">
                  You are on the Free plan. Upgrade below to unlock more.
                </p>
              )}
            </CardFooter>
          </Card>

          {/* Per-voter pricing explainer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Per-voter activation pricing
              </CardTitle>
              <CardDescription>
                Election activations are billed per voter at the rates below.
                Bulk discounts apply automatically above the threshold.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Standard rate
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {formatCurrency(PRICING_CONFIG.standardRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    per voter, up to {PRICING_CONFIG.bulkThreshold.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bulk rate
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {formatCurrency(PRICING_CONFIG.bulkRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    per voter above {PRICING_CONFIG.bulkThreshold.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Currency
                  </p>
                  <p className="mt-1 text-2xl font-bold">{PRICING_CONFIG.currency}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All activations billed in Nigerian Naira
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Worked example
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  An election with <span className="font-semibold text-foreground">5,000 voters</span> would cost{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      PRICING_CONFIG.standardRate * PRICING_CONFIG.bulkThreshold +
                        PRICING_CONFIG.bulkRate * (5000 - PRICING_CONFIG.bulkThreshold)
                    )}
                  </span>{" "}
                  ({formatCurrency(PRICING_CONFIG.standardRate)} × {PRICING_CONFIG.bulkThreshold.toLocaleString()} +{" "}
                  {formatCurrency(PRICING_CONFIG.bulkRate)} × {(5000 - PRICING_CONFIG.bulkThreshold).toLocaleString()}).
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plan comparison */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Compare plans</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade or downgrade at any time. Payments are processed securely.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const isCurrent = plan.id === currentTier;
            const isPopular = plan.id === "PROFESSIONAL";
            const isEnterprise = plan.id === "ENTERPRISE";
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.3) }}
              >
                <Card
                  className={cn(
                    "relative h-full overflow-hidden",
                    isCurrent && "border-primary",
                    isPopular && !isCurrent && "shadow-glow"
                  )}
                >
                  {isPopular && !isCurrent && (
                    <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Most popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute right-0 top-0 rounded-bl-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Current
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-3">
                      <span className="text-3xl font-bold tracking-tight">
                        {formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">/ year</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="space-y-1.5 text-xs">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        <Check className="h-4 w-4" />
                        Current plan
                      </Button>
                    ) : isEnterprise ? (
                      <Button className="w-full" variant="outline" asChild>
                        <a href="mailto:sales@votewise.com.ng">Contact sales</a>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => upgrade(plan.id)}
                        disabled={upgradingTier === plan.id}
                      >
                        {upgradingTier === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Upgrading…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" /> Upgrade
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment history */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment history
          </CardTitle>
          <CardDescription>
            The most recent payments associated with your subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            </div>
          ) : (
            <ScrollArea className="scroll-area-custom max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Reference</TableHead>
                    <TableHead className="min-w-[120px]">Amount</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="hidden min-w-[140px] sm:table-cell">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-xs">
                        {p.reference}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            p.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                              : p.status === "FAILED"
                                ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                                : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {p.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your plan will end immediately and revert to the Free tier. Your
              elections, voters, and audit logs will not be affected. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cancelling…
                </>
              ) : (
                "Cancel subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

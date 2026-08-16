import Link from "next/link";
import type { Metadata } from "next";
import {
  Check,
  CheckCircle2,
  X,
  ArrowRight,
  Settings2,
  CreditCard,
  Rocket,
  Wallet,
  Sparkles,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Reveal } from "@/components/shared/reveal";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { SUBSCRIPTION_PLANS, PRICING_CONFIG } from "@/lib/constants";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple subscription plans and transparent per-voter pricing for elections of any size. Start free, scale to enterprise.",
};

const ACTIVATION_STEPS = [
  {
    icon: Settings2,
    title: "Configure election",
    description:
      "Admin sets up the election, positions, candidates and voter list inside the dashboard.",
  },
  {
    icon: Wallet,
    title: "Choose a plan",
    description:
      "Pick the subscription tier that matches your voter count and election volume.",
  },
  {
    icon: CreditCard,
    title: "Pay & activate",
    description:
      "Pay per-voter (₦400 standard, ₦300 bulk above 2,000) to activate the election.",
  },
  {
    icon: Rocket,
    title: "Go LIVE",
    description:
      "Status flips to LIVE. Voters verify, cast ballots and results stream in real time.",
  },
];

const COMPARISON_ROWS: {
  label: string;
  values: (string | boolean)[];
}[] = [
  {
    label: "Active elections",
    values: ["1", "5", "25", "Unlimited"],
  },
  {
    label: "Max voters per election",
    values: ["100", "1,000", "10,000", "Unlimited"],
  },
  {
    label: "Email OTP verification",
    values: [true, true, true, true],
  },
  {
    label: "SMS OTP verification",
    values: [false, true, true, true],
  },
  {
    label: "All verification channels",
    values: [false, false, true, true],
  },
  {
    label: "Real-time monitoring",
    values: [false, true, true, true],
  },
  {
    label: "Audit logs",
    values: [false, true, true, true],
  },
  {
    label: "Advanced analytics",
    values: [false, false, true, true],
  },
  {
    label: "Observers & auditor roles",
    values: [false, false, true, true],
  },
  {
    label: "Priority support",
    values: [false, false, true, true],
  },
  {
    label: "Custom domains",
    values: [false, false, false, true],
  },
  {
    label: "Dedicated infrastructure",
    values: [false, false, false, true],
  },
  {
    label: "SLA & onboarding",
    values: [false, false, false, true],
  },
  {
    label: "Dedicated account manager",
    values: [false, false, false, true],
  },
];

const PRICING_FAQ = [
  {
    q: "What is the difference between a subscription and per-voter pricing?",
    a: "A subscription (Free, Starter, Professional, Enterprise) sets your platform limits — how many active elections and voters you can hold at once. Per-voter pricing is the activation fee you pay to take a specific election LIVE, billed per eligible voter on that election's roll.",
  },
  {
    q: "When do I pay the per-voter activation fee?",
    a: "You pay it when you flip an election's status to LIVE and the system detects it is unpaid. You can pay immediately, or — for Enterprise and large institutions — submit a negotiation request for a custom amount before paying.",
  },
  {
    q: "How does bulk per-voter pricing work?",
    a: `Standard per-voter rate is ${formatCurrency(
      PRICING_CONFIG.standardRate
    )}. Once an election has more than ${formatNumber(
      PRICING_CONFIG.bulkThreshold
    )} voters, the rate drops to ${formatCurrency(
      PRICING_CONFIG.bulkRate
    )} per voter for the voters above the threshold.`,
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or cancel your subscription at any time from the admin dashboard. Upgrades take effect immediately; cancellations apply at the end of the current cycle.",
  },
  {
    q: "Do you offer custom pricing for very large institutions?",
    a: "Absolutely. Enterprise customers get unlimited voters and elections, custom domains, dedicated infrastructure and an account manager. Submit a negotiation request from any election's activation screen and our team will respond.",
  },
  {
    q: "Is there a free plan I can test with?",
    a: `Yes. The Free plan supports up to ${formatNumber(
      SUBSCRIPTION_PLANS[0].maxVoters
    )} voters and one active election — enough to run a small club or pilot election end-to-end without a credit card.`,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <PricingHero />
        <PlanCards />
        <PerVoterPricing />
        <ActivationFlow />
        <ComparisonTable />
        <PricingFaq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function PricingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Pricing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-6 max-w-3xl">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 px-3 py-1 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Transparent pricing
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Pay for the elections you actually run
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Start free. Upgrade when you need more elections or voters. Every
            plan includes the full security stack — you only pay more as your
            electorate grows.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Bulk per-voter savings above 2,000 voters — no long-term contract
            required.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Plan cards                                                                 */
/* -------------------------------------------------------------------------- */

function PlanCards() {
  return (
    <section aria-labelledby="plans-heading" className="scroll-mt-24">
      <h2 id="plans-heading" className="sr-only">
        Subscription plans
      </h2>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const popular = plan.id === "PROFESSIONAL";
            const priceLabel =
              plan.price < 0
                ? "Custom"
                : plan.price === 0
                  ? "Free"
                  : formatCurrency(plan.price);
            return (
              <Reveal key={plan.id} delay={i * 0.06}>
                <Card
                  className={cn(
                    "relative h-full",
                    popular && "border-primary shadow-glow"
                  )}
                >
                  {popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Sparkles className="h-3 w-3" />
                      Most popular
                    </Badge>
                  )}
                  <CardContent className="flex h-full flex-col p-6">
                    <h3 className="text-base font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">
                        {priceLabel}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          /cycle
                        </span>
                      )}
                    </div>
                    <Button
                      asChild
                      variant={popular ? "default" : "outline"}
                      className="mt-5 w-full"
                    >
                      <Link href="/register">
                        {plan.price < 0
                          ? "Contact sales"
                          : plan.price === 0
                            ? "Start free"
                            : "Choose " + plan.name}
                      </Link>
                    </Button>
                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-foreground/90">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-voter pricing                                                          */
/* -------------------------------------------------------------------------- */

function PerVoterPricing() {
  return (
    <section
      aria-labelledby="pervoter-heading"
      className="scroll-mt-24 border-y border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Per-voter pricing
            </p>
            <h2
              id="pervoter-heading"
              className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
            >
              Activation is billed per voter — and gets cheaper at scale
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Beyond your subscription, taking an election LIVE costs a small
              per-voter fee based on your voter roll. It drops automatically once
              you cross the bulk threshold.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                `Standard rate: ${formatCurrency(
                  PRICING_CONFIG.standardRate
                )} per voter`,
                `Bulk rate: ${formatCurrency(
                  PRICING_CONFIG.bulkRate
                )} per voter above ${formatNumber(
                  PRICING_CONFIG.bulkThreshold
                )} voters`,
                "Enterprise & government can negotiate custom amounts",
                "No hidden setup, hosting or result-publication fees",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal delay={0.1}>
            <Card className="overflow-hidden shadow-glow">
              <CardContent className="p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cost calculator (example)
                </p>
                <div className="mt-5 space-y-3">
                  <PricingRow
                    label={`${formatNumber(2000)} voters @ standard`}
                    value={formatCurrency(2000 * PRICING_CONFIG.standardRate)}
                    badge="Standard"
                  />
                  <PricingRow
                    label={`+${formatNumber(
                      3000
                    )} voters @ bulk (${formatCurrency(
                      PRICING_CONFIG.bulkRate
                    )})`}
                    value={formatCurrency(3000 * PRICING_CONFIG.bulkRate)}
                    badge="Bulk"
                    badgeTone="emerald"
                  />
                  <div className="my-2 h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Example: {formatNumber(5000)}-voter election
                    </span>
                    <span className="text-xl font-bold tabular-nums">
                      {formatCurrency(
                        2000 * PRICING_CONFIG.standardRate +
                          3000 * PRICING_CONFIG.bulkRate
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    vs {formatCurrency(
                      5000 * PRICING_CONFIG.standardRate
                    )} without bulk savings — you save{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(
                        5000 * PRICING_CONFIG.standardRate -
                          (2000 * PRICING_CONFIG.standardRate +
                            3000 * PRICING_CONFIG.bulkRate)
                      )}
                    </span>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PricingRow({
  label,
  value,
  badge,
  badgeTone = "default",
}: {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: "default" | "emerald";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {badge && (
          <Badge
            variant="outline"
            className={cn(
              "px-1.5 py-0 text-[10px] font-semibold",
              badgeTone === "emerald"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {badge}
          </Badge>
        )}
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Activation flow                                                            */
/* -------------------------------------------------------------------------- */

function ActivationFlow() {
  return (
    <section aria-labelledby="activation-heading" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Election activation flow
          </p>
          <h2
            id="activation-heading"
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            From configuration to LIVE in four steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The admin dashboard walks you through activation. Payment unlocks
            the LIVE status — voters can then verify and cast ballots.
          </p>
        </div>

        <div className="relative mt-12">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-border lg:block"
          />
          <ol className="grid gap-8 lg:grid-cols-4">
            {ACTIVATION_STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08} className="relative">
                <div className="flex items-center gap-4 lg:block">
                  <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold lg:mt-5">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground lg:pr-4">
                  {step.description}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison table                                                           */
/* -------------------------------------------------------------------------- */

function ComparisonTable() {
  const plans = SUBSCRIPTION_PLANS;
  return (
    <section
      aria-labelledby="comparison-heading"
      className="scroll-mt-24 border-y border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Compare plans
          </p>
          <h2
            id="comparison-heading"
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Every feature, side by side
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            All plans ship with the security stack. Higher tiers add scale,
            channels and institutional controls.
          </p>
        </div>

        <Card className="mt-10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px] text-sm font-semibold">
                  Feature
                </TableHead>
                {plans.map((plan) => (
                  <TableHead
                    key={plan.id}
                    className={cn(
                      "text-center text-sm font-semibold",
                      plan.id === "PROFESSIONAL" && "text-primary"
                    )}
                  >
                    {plan.name}
                    {plan.id === "PROFESSIONAL" && (
                      <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-primary/80">
                        Most popular
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_ROWS.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {row.values.map((val, idx) => (
                    <TableCell
                      key={idx}
                      className={cn(
                        "text-center",
                        plans[idx].id === "PROFESSIONAL" && "bg-primary/5"
                      )}
                    >
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )
                      ) : (
                        <span className="text-sm tabular-nums">{val}</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing FAQ                                                                */
/* -------------------------------------------------------------------------- */

function PricingFaq() {
  return (
    <section aria-labelledby="pricingfaq-heading" className="scroll-mt-24">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <HelpCircle className="h-3.5 w-3.5" />
            Pricing FAQ
          </p>
          <h2
            id="pricingfaq-heading"
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Questions about how pricing works
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 w-full">
          {PRICING_FAQ.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section aria-labelledby="finalcta-heading">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-glow sm:px-12 lg:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)]"
          />
          <div className="relative">
            <h2
              id="finalcta-heading"
              className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Pick a plan and run your first election today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80">
              Free to start. Upgrade only when your electorate grows. Cancel
              anytime.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">
                  Get Started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link href="/support">Talk to sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

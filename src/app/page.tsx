import Link from "next/link";
import {
  ShieldCheck,
  Vote,
  BarChart3,
  Users,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Activity,
  Gauge,
  Radio,
  ServerCog,
  FileCheck2,
  Fingerprint,
  EyeOff,
  ScrollText,
  TimerReset,
  ShieldAlert,
  Quote,
  Sparkles,
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
import { StatusBadge } from "@/components/shared/status-badge";
import { Logo } from "@/components/shared/logo";
import { Reveal } from "@/components/shared/reveal";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { CandidateResultsBoard } from "@/components/shared/candidate-results-board";
import { SecurityBackground, DataFlowParticles, VoteCountingAnimation, CountUpNumber } from "@/components/shared/animated-backgrounds";
import { SUBSCRIPTION_PLANS, APP_NAME } from "@/lib/constants";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

const USE_CASES = [
  "Universities & Faculties",
  "Student Unions",
  "Professional Associations",
  "Churches",
  "Cooperatives & NGOs",
  "Corporate Organizations",
  "Clubs & Societies",
  "Government Institutions",
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Tamper-proof ballots",
    description:
      "Every ballot is sealed with an anonymous token and a verifiable hash. No one — not even admins — can alter a cast vote.",
  },
  {
    icon: Vote,
    title: "Verified voters only",
    description:
      "Voters confirm identity with OTP via email or SMS before voting. Duplicate and spoof ballots are stopped at the door.",
  },
  {
    icon: BarChart3,
    title: "Live results & analytics",
    description:
      "Watch turnout, verification rates and results stream in real time. Publish with one click when polls close.",
  },
  {
    icon: Users,
    title: "Built for every scale",
    description:
      "From a 40-person club election to a 50,000-voter faculty vote — Votewise scales without breaking a sweat.",
  },
  {
    icon: Lock,
    title: "Ballot secrecy by design",
    description:
      "Votes are dissociated from voter identity the moment they are cast. Receipts verify without revealing choices.",
  },
  {
    icon: Zap,
    title: "Sub-3-second voting",
    description:
      "A fast, accessible ballot interface means voters finish in seconds — on any device, even on slow networks.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create election",
    description:
      "Set up your election, positions and candidates in minutes. Import voters from a spreadsheet.",
  },
  {
    n: "02",
    title: "Verify voters",
    description:
      "Each voter confirms identity with an OTP. The system blocks duplicates and ineligible voters automatically.",
  },
  {
    n: "03",
    title: "Cast votes",
    description:
      "Voters select candidates in a clean, accessible interface and receive a signed receipt they can audit.",
  },
  {
    n: "04",
    title: "Publish results",
    description:
      "Results are tallied automatically and tamper-proof. Publish publicly with a verifiable audit trail.",
  },
];

const SECURITY_ITEMS = [
  {
    icon: Fingerprint,
    title: "End-to-end verification",
    description:
      "OTP-based identity confirmation via email or SMS, with attempt limits and lockout protection.",
  },
  {
    icon: FileCheck2,
    title: "Tamper-proof ballots",
    description:
      "Anonymous voting tokens plus a cryptographic ballot hash make every vote verifiable and immutable.",
  },
  {
    icon: EyeOff,
    title: "Ballot secrecy model",
    description:
      "Voter identity is dissociated from ballot choices at cast time. Receipts prove participation, never selections.",
  },
  {
    icon: ScrollText,
    title: "Full audit trails",
    description:
      "Every action — from configuration to result publication — is logged and attributable to a named operator.",
  },
  {
    icon: TimerReset,
    title: "Adaptive rate limiting",
    description:
      "OTP, vote and auth endpoints are throttled to stop brute-force, scripting and flooding attacks.",
  },
  {
    icon: ShieldAlert,
    title: "Anti-enumeration",
    description:
      "Login and verification responses are uniform — attackers cannot probe for valid emails or voter IDs.",
  },
];

const MONITORING_TILES = [
  {
    icon: Users,
    label: "Live turnout",
    value: "68.4%",
    hint: "4,210 of 6,150 voters",
  },
  {
    icon: Fingerprint,
    label: "Verified voters",
    value: "4,210",
    hint: "99.2% verification rate",
  },
  {
    icon: Radio,
    label: "Active sessions",
    value: "312",
    hint: "voting right now",
  },
  {
    icon: Gauge,
    label: "System health",
    value: "99.98%",
    hint: "uptime this cycle",
  },
];

const MONITORING_BARS = [42, 58, 49, 66, 60, 74, 70, 83, 77, 90, 86, 95];

const RESULTS = [
  { id: "1", name: "Adebayo Okafor", pct: 42, votes: 1768, position: "President" },
  { id: "2", name: "Chinwe Eze", pct: 31, votes: 1305, position: "President" },
  { id: "3", name: "Ibrahim Bello", pct: 18, votes: 758, position: "President" },
  { id: "4", name: "Ngozi Obi", pct: 9, votes: 379, position: "President" },
];

const TESTIMONIALS = [
  {
    quote:
      "We moved our Student Union election online after years of paper-ballot disputes. Votewise gave us a turnout record and a result nobody could contest.",
    name: "Dr. Adebayo Ogunleye",
    role: "Dean of Student Affairs",
    org: "University of Lagos",
  },
  {
    quote:
      "The audit trail is what sold our board. Every action is logged, every ballot is verifiable. For the first time, observers had nothing to question.",
    name: "Mrs. Funmilayo Adeyemi",
    role: "Electoral Committee Chair",
    org: "Lagos Chamber of Commerce",
  },
  {
    quote:
      "We ran 14 faculty elections in one week. The real-time monitoring meant we caught and resolved issues before they became disputes.",
    name: "Prof. Nwankwo Ibezim",
    role: "Registrar",
    org: "Nnamdi Azikiwe University",
  },
];

const FAQ_ITEMS = [
  {
    q: "How do you protect voter privacy?",
    a: "Voter identity is confirmed once at verification, then dissociated from the ballot at cast time. We never store which voter chose which candidate. Receipts confirm participation without revealing choices, and observers see only aggregate results.",
  },
  {
    q: "How does voter verification work?",
    a: "Each voter receives a one-time passcode (OTP) via email or SMS. They enter it alongside their voter ID (matric number, member ID, or national ID). The system checks eligibility, blocks duplicates, and enforces attempt limits. Only verified voters can request a ballot.",
  },
  {
    q: "Can we audit the election afterwards?",
    a: "Yes. Every action — configuration, voter import, status changes, vote casts, result publication — is recorded in an immutable audit trail. Auditors and observers (with the right role) can review logs, verify ballot hashes against receipts, and confirm result integrity.",
  },
  {
    q: "Do you offer bulk / per-voter pricing?",
    a: "We do. Beyond subscription plans, elections are activated at a per-voter rate: ₦400 per voter standard, dropping to ₦300 per voter above 2,000 voters. Large institutions can also negotiate custom pricing directly.",
  },
  {
    q: "Which verification channels are supported?",
    a: "Email OTP on all plans. SMS OTP on Starter and above. Professional and Enterprise unlock additional channels and custom identity flows. Channels can be mixed per election based on what your voters have access to.",
  },
  {
    q: "Where is voter data stored, and for how long?",
    a: "Data is hosted in-region with encryption at rest and in transit. Voter records are retained only as long as needed for audit purposes, after which they can be purged per your data-residency policy. Enterprise customers can choose their deployment region.",
  },
];

const PRICING_PREVIEW_PLANS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <UseCases />
        <Features />
        <HowItWorks />
        <Security />
        <Monitoring />
        <Analytics />
        <Testimonials />
        <PricingPreview />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Hero                                                                    */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-animated-gradient" aria-labelledby="hero-heading">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-animated" />
      <SecurityBackground />
      <DataFlowParticles />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in-up">
            <Badge
              variant="outline"
              className="gap-2 border-primary/30 bg-primary/5 px-3 py-1 text-primary"
            >
              <span className="relative flex h-2 w-2 text-emerald-500">
                <span className="pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Secure. Transparent. Trusted.
            </Badge>

            <h1
              id="hero-heading"
              className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            >
              <span className="text-gradient-animated">Election Management</span> Built
              for Organizations
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Run secure, auditable elections for universities, unions,
              associations and institutions. Voter verification, real-time
              monitoring and tamper-proof results — all in one platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group shadow-glow animate-vw-pulse-glow">
                <Link href="/register">
                  Start Free Election
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/support">Book a Demo</Link>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-2 border-t border-border/60 pt-6 sm:gap-4">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Voters supported
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                  <CountUpNumber target={10000} />+
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Auditable
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                  <CountUpNumber target={100} />%
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Vote cast
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">
                  &lt;3s
                </dd>
              </div>
            </dl>
          </div>

          <Reveal delay={0.15}>
            <HeroPreviewCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroPreviewCard() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-3xl bg-primary/10 blur-3xl animate-vw-float-slow"
      />
      <Card className="overflow-hidden shadow-glow animate-vw-card-enter">
        <CardContent className="p-5 sm:p-6">
          {/* Vote counting animation overlay */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
            <VoteCountingAnimation />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Departmental Election · 2024
              </p>
              <h3 className="mt-1 truncate text-base font-semibold">
                Faculty of Engineering — Class Rep
              </h3>
            </div>
            <StatusBadge status="LIVE" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Turnout
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">68.4%</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Votes cast
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">4,210</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">1,940</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium">Votes per hour</p>
              <p className="text-xs text-muted-foreground">Last 12h</p>
            </div>
            <div
              className="flex h-24 items-end gap-1.5"
              role="img"
              aria-label="Votes per hour bar chart"
            >
              {MONITORING_BARS.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t-sm transition-all",
                    i === MONITORING_BARS.length - 1
                      ? "bg-primary"
                      : "bg-primary/55"
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {RESULTS.slice(0, 3).map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", c.color)}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Use cases strip                                                         */
/* -------------------------------------------------------------------------- */

function UseCases() {
  return (
    <section className="border-y border-border/60 bg-secondary/30" aria-labelledby="usecases-heading">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <p
          id="usecases-heading"
          className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Trusted by organizations of every kind
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {USE_CASES.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-3 text-center text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Why Votewise — features                                                 */
/* -------------------------------------------------------------------------- */

function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="Why Votewise"
          title="Everything an organization needs to run a trusted election"
          description="From voter verification to tamper-proof results, Votewise handles the full lifecycle — so your committee can focus on governance, not logistics."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. How it works                                                            */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="howitworks-heading"
      className="scroll-mt-24 border-y border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="From setup to published results in four steps"
          description="A guided workflow that takes you from a blank election to an audited, public result — without spreadsheets, paper or disputes."
        />
        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-border lg:block"
          />
          <ol className="grid gap-8 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} className="relative">
                <div className="flex items-center gap-4 lg:block">
                  <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <span className="text-sm font-bold tabular-nums">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold lg:mt-5">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground lg:pr-4">
                  {s.description}
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
/* 5. Security                                                                */
/* -------------------------------------------------------------------------- */

function Security() {
  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="overflow-hidden rounded-3xl border border-primary/20 bg-primary text-primary-foreground shadow-glow">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-8 sm:p-10 lg:p-12">
              <Badge className="border border-white/20 bg-white/10 text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Security &amp; trust
              </Badge>
              <h2
                id="security-heading"
                className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Elections you can defend, results nobody can contest
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/80">
                Votewise is engineered around six security guarantees that
                protect voter privacy, ballot integrity and operator
                accountability — at every stage of the election lifecycle.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href="/register">Start a secure election</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/25 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                >
                  <Link href="/support">Talk to security team</Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-white/10 bg-primary-foreground/[0.04] p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <ul className="grid gap-5 sm:grid-cols-2">
                {SECURITY_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-foreground">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Real-time monitoring                                                    */
/* -------------------------------------------------------------------------- */

function Monitoring() {
  return (
    <section
      id="monitoring"
      aria-labelledby="monitoring-heading"
      className="scroll-mt-24 border-y border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Real-time monitoring"
              title="An election command center, live"
              description="Watch turnout climb, verification rates hold, and active sessions pulse — the moment they happen. Spot anomalies before they become disputes."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Live turnout and verification rates, refreshed in real time",
                "Active voter sessions and system health at a glance",
                "Position-by-position results stream as votes are cast",
                "Configurable observer and auditor roles, read-only by default",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal delay={0.1}>
            <CommandCenterCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CommandCenterCard() {
  return (
    <Card className="overflow-hidden shadow-glow">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              Election Command Center
            </span>
          </div>
          <StatusBadge status="LIVE" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {MONITORING_TILES.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-border/60 bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {tile.label}
                </p>
                <tile.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1.5 text-xl font-bold tabular-nums">
                {tile.value}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tile.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium">Votes per minute</p>
            <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              streaming
            </p>
          </div>
          <div
            className="flex h-28 items-end gap-1.5"
            role="img"
            aria-label="Live votes per minute chart"
          >
            {[28, 44, 38, 56, 47, 63, 58, 72, 66, 80, 74, 88, 81, 92, 96].map(
              (h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/70 transition-all hover:bg-primary"
                  style={{ height: `${h}%` }}
                />
              )
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">System health</span>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            All systems operational
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Analytics preview                                                       */
/* -------------------------------------------------------------------------- */

function Analytics() {
  const total = 4210;
  return (
    <section id="analytics" aria-labelledby="analytics-heading" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <ResultsCard total={total} />
          </Reveal>
          <div className="lg:order-first">
            <SectionHeading
              align="left"
              eyebrow="Analytics &amp; results"
              title="Results that publish themselves"
              description="Tallying is automatic and tamper-proof. The moment polls close, your committee has a complete, auditable breakdown — ready to publish publicly with one click."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Position-by-position results with live progress bars",
                "Vote counts and percentages, computed server-side",
                "Public results page with verifiable receipt lookup",
                "Exportable analytics for committees and observers",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsCard({ total }: { total: number }) {
  return (
    <Card className="overflow-hidden shadow-glow">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Results preview
            </p>
            <h3 className="mt-1 text-base font-semibold">
              Departmental Class Rep Election 2024
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatNumber(total)} valid votes counted
            </p>
          </div>
          <StatusBadge status="PUBLISHED" />
        </div>

        <div className="mt-5">
          <CandidateResultsBoard
            candidates={RESULTS.map((c) => ({
              id: c.id,
              name: c.name,
              position: c.position,
              voteCount: c.votes,
              percentage: c.pct,
            }))}
            showLiveResults={false}
            totalVotes={total}
            totalVoters={total}
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <FileCheck2 className="h-4 w-4 text-primary" />
            Ballot hash verified
          </span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            4,210 / 4,210 receipts matched
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Testimonials                                                            */
/* -------------------------------------------------------------------------- */

function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="scroll-mt-24 border-y border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="Case studies"
          title="Trusted by institutions that cannot afford a dispute"
          description="Universities, associations, and organizations worldwide run their most sensitive elections on Votewise."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col p-6">
                  <Quote className="h-7 w-7 text-primary/40" />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role} · {t.org}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Pricing preview                                                         */
/* -------------------------------------------------------------------------- */

function PricingPreview() {
  const plans = SUBSCRIPTION_PLANS.filter((p) =>
    PRICING_PREVIEW_PLANS.includes(p.id)
  );
  return (
    <section
      id="pricing-preview"
      aria-labelledby="pricing-preview-heading"
      className="scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="Pricing"
          title="Plans that scale with your electorate"
          description="Start free, then pay per election as you grow. Every plan includes the full security stack — you only pay for more voters and elections."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const popular = plan.id === "PROFESSIONAL";
            return (
              <Reveal key={plan.id} delay={i * 0.08}>
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
                        {plan.price < 0
                          ? "Custom"
                          : plan.price === 0
                            ? "Free"
                            : formatCurrency(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          /election cycle
                        </span>
                      )}
                    </div>
                    <Button
                      asChild
                      variant={popular ? "default" : "outline"}
                      className="mt-5 w-full"
                    >
                      <Link href="/register">
                        {plan.price < 0 ? "Contact sales" : "Get started"}
                      </Link>
                    </Button>
                    <ul className="mt-6 space-y-2.5">
                      {plan.features.slice(0, 5).map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
        <div className="mt-8 text-center">
          <Button asChild variant="link" className="text-primary">
            <Link href="/pricing">
              See full pricing &amp; comparison
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. FAQ                                                                    */
/* -------------------------------------------------------------------------- */

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-t border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers to the questions institutions ask first"
          description="Still need clarity? Our team can walk your committee through a tailored demo."
        />
        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQ_ITEMS.map((item, i) => (
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
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-background p-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Still have questions about your election?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Talk to our team — we help institutions scope, secure and run
              elections of every size.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/support">Contact us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Final CTA                                                              */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section aria-labelledby="finalcta-heading">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-glow sm:px-12 lg:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)]"
          />
          <div className="relative">
            <h2
              id="finalcta-heading"
              className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Ready to run a secure election?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80">
              Set up your organization, import voters and go live in under an
              hour. No credit card required to start.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Get Started free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-primary-foreground/70">
              <Logo size="sm" className="[&_span]:text-primary-foreground" />
              <span>{APP_NAME} — trusted by institutions worldwide</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared section heading                                                      */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "")}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

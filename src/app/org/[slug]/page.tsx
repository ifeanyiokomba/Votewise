"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatNumber, formatDate, timeUntil, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/shared/logo";
import { SupportChatWidget } from "@/components/shared/support-chat-widget";
import { CandidateResultsBoard } from "@/components/shared/candidate-results-board";
import {
  ShieldCheck,
  Vote,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Globe,
  Sparkles,
  Trophy,
  Crown,
  BarChart3,
} from "lucide-react";

interface OrgCandidate {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  manifesto: string | null;
}

interface OrgPosition {
  id: string;
  title: string;
  order: number;
  candidates: OrgCandidate[];
}

interface OrgCandidateWithVotes extends OrgCandidate {
  voteCount?: number;
  percentage?: number;
}

interface OrgPositionWithVotes extends OrgPosition {
  candidates: OrgCandidateWithVotes[];
  totalVotes?: number;
}

interface LiveElection {
  id: string;
  name: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string;
  resultVisibility?: string;
  showLiveResults?: boolean;
  stats?: { voters: number; votes: number; turnout: number };
  _count?: { voters: number; votes: number };
  positions: OrgPositionWithVotes[];
}

interface PublishedElection {
  id: string;
  name: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string;
  stats?: { voters: number; votes: number; turnout: number };
  _count?: { voters: number; votes: number };
  positions: OrgPositionWithVotes[];
}

interface UpcomingElection {
  id: string;
  name: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string;
}

interface OrgData {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    domain: string | null;
    contactInfo: string | null;
    branding: string | null;
  };
  liveElections: LiveElection[];
  publishedElections: PublishedElection[];
  upcomingElections: UpcomingElection[];
}

export default function OrgHomePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<OrgData>(`/api/public/org?slug=${params.slug}`);
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message ?? "Organization not found");
    }
  }, [params.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  if (loading) return <OrgHomeSkeleton />;
  if (error || !data) return <NotFoundError />;

  const { organization: org, liveElections, publishedElections, upcomingElections } = data;
  const hasLive = liveElections.length > 0;
  const hasPublished = publishedElections.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── Branded Header ─── */}
      <header className="relative overflow-hidden border-b bg-gradient-to-br from-primary/8 via-accent/30 to-background">
        <div className="absolute right-0 top-0 h-48 w-48 -translate-y-12 translate-x-12 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 translate-y-8 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          {/* Logo + name */}
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {org.logo ? (
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-border bg-background shadow-md">
                <img src={org.logo} alt={org.name} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-md">
                <Building2 className="h-10 w-10" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {hasLive && (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Election Live
                  </Badge>
                )}
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{org.name}</h1>
              {org.description && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{org.description}</p>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secure voting
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <Vote className="h-3.5 w-3.5 text-primary" />
              Powered by Votewise
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* ─── LIVE ELECTIONS ─── */}
          {hasLive ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Vote className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Active Elections</h2>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                  Voting now
                </Badge>
              </div>

              {liveElections.map((election, ei) => (
                <motion.div
                  key={election.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ei * 0.1 }}
                  className="mb-8"
                >
                  <Card className="overflow-hidden border-emerald-200/50 dark:border-emerald-800/30">
                    {/* Election header */}
                    <div className="border-b bg-emerald-50/30 p-5 dark:bg-emerald-950/10">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">{election.name}</h3>
                          {election.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{election.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {election.endTime && (
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              <Clock className="h-3 w-3" />
                              ends in {timeUntil(election.endTime)}
                            </Badge>
                          )}
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {formatNumber(election._count.voters)} voters
                            </span>
                            <span className="flex items-center gap-1">
                              <Vote className="h-3 w-3" /> {formatNumber(election._count.votes)} votes
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                          <Link href={`/vote/${election.id}`}>
                            Cast Your Vote
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Candidate headshots + live results (if enabled) */}
                    <CardContent className="p-5">
                      {election.showLiveResults ? (
                        /* ─── Live results with futuristic CandidateResultsBoard ─── */
                        <div className="space-y-6">
                          {election.positions.map((pos, pi) => (
                            <motion.div key={pos.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (ei * 0.1) + (pi * 0.05) }}>
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{pos.title}</h4>
                                <span className="text-[10px] text-muted-foreground">{pos.totalVotes ?? 0} votes</span>
                              </div>
                              <CandidateResultsBoard
                                candidates={pos.candidates.map((c) => ({
                                  id: c.id,
                                  name: c.name,
                                  photo: c.photo,
                                  position: pos.title,
                                  bio: c.bio,
                                  voteCount: c.voteCount,
                                  percentage: c.percentage,
                                }))}
                                showLiveResults={true}
                                totalVotes={pos.totalVotes ?? 0}
                                totalVoters={election.totalVoters ?? 0}
                              />
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        /* ─── Candidates only (no live results) ─── */
                        <div className="space-y-6">
                          {election.positions.map((pos, pi) => (
                            <motion.div key={pos.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (ei * 0.1) + (pi * 0.05) }}>
                              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{pos.title}</h4>
                              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {pos.candidates.map((cand, ci) => (
                                  <motion.div key={cand.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (ei * 0.1) + (pi * 0.05) + (ci * 0.03) }} className="group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:border-primary/30 hover:shadow-md hover-lift">
                                    <Avatar className="h-20 w-20 border-2 border-border shadow-sm transition-transform group-hover:scale-105">
                                      {cand.photo ? <AvatarImage src={cand.photo} alt={cand.name} /> : <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{initials(cand.name)}</AvatarFallback>}
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-semibold leading-tight">{cand.name}</p>
                                      {cand.bio && <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{cand.bio}</p>}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </section>
          ) : (
            <section className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-muted">
                <Vote className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">No active elections</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no elections currently open for voting. Check back soon!
              </p>
            </section>
          )}

          {/* ─── UPCOMING ELECTIONS ─── */}
          {upcomingElections.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold tracking-tight">Upcoming Elections</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingElections.map((el, i) => (
                  <motion.div
                    key={el.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{el.name}</p>
                            {el.startTime && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Starts {formatDate(el.startTime)}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                            {timeUntil(el.startTime)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ─── PUBLISHED ELECTION RESULTS ─── */}
          {hasPublished && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Election Results</h2>
              </div>
              <div className="space-y-6">
                {publishedElections.map((election, ei) => (
                  <motion.div key={election.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ei * 0.1 }}>
                    <Card className="overflow-hidden">
                      <div className="border-b bg-primary/5 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold tracking-tight">{election.name}</h3>
                            {election.description && <p className="mt-0.5 text-xs text-muted-foreground">{election.description}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                              <CheckCircle2 className="h-3 w-3" /> Concluded
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {election.stats?.turnout?.toFixed(1) ?? 0}% turnout · {election.stats?.votes ?? 0} votes
                            </span>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <div className="space-y-6">
                          {election.positions.map((pos) => (
                            <div key={pos.id}>
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{pos.title}</h4>
                                <span className="text-[10px] text-muted-foreground">{pos.totalVotes ?? 0} total votes</span>
                              </div>
                              <div className="space-y-3">
                                <CandidateResultsBoard
                                  candidates={pos.candidates.map((c) => ({
                                    id: c.id,
                                    name: c.name,
                                    photo: c.photo,
                                    position: pos.title,
                                    voteCount: c.voteCount,
                                    percentage: c.percentage,
                                  }))}
                                  showLiveResults={false}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ─── ORG INFO ─── */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  About {org.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  {org.description && (
                    <p className="text-sm text-muted-foreground">{org.description}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    {org.contactInfo && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>{org.contactInfo}</span>
                      </div>
                    )}
                    {org.domain && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 text-primary" />
                        <span>{org.domain}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/30 p-4">
                  <img src="/logo.svg" alt="Votewise" className="h-8 w-auto opacity-70" />
                  <p className="text-center text-xs text-muted-foreground">
                    This election is powered by <strong>Votewise</strong> — built by{" "}
                    <a href="https://okomba.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Okomba Analytics</a>.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Tamper-evident · OTP verified · Anonymous ballots
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-secondary/30">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {org.name}. Powered by Votewise — built by{" "}
            <a href="https://okomba.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Okomba Analytics</a>.
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Secure · Transparent · Auditable
          </p>
        </div>
      </footer>

      {/* Floating support chat */}
      <SupportChatWidget />
    </div>
  );
}

function NotFoundError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
        <Building2 className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Organization not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The organization you're looking for doesn't exist or has been removed.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Back to Votewise</Link>
      </Button>
    </div>
  );
}

function OrgHomeSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b p-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-8 p-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}

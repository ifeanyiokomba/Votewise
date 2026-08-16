"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ElectionCardSkeleton,
  ErrorState,
  EmptyState,
} from "@/components/dashboard/dashboard-skeleton";
import { ElectionCard } from "@/components/dashboard/election-card";
import { CreateElectionDialog } from "@/components/dashboard/create-election-dialog";
import { TemplateDialog } from "@/components/dashboard/template-dialog";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { Plus, Vote, Loader2, LayoutTemplate } from "lucide-react";
import type { ElectionDTO } from "@/components/dashboard/types";

type Filter = "all" | "active" | "draft" | "concluded";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "concluded", label: "Concluded" },
];

const ACTIVE_STATUSES = new Set(["LIVE", "SCHEDULED", "READY", "PAUSED", "VERIFICATION"]);
const DRAFT_STATUSES = new Set(["DRAFT", "CONFIGURATION", "VOTER_IMPORT", "CANDIDATE_SETUP"]);
const CONCLUDED_STATUSES = new Set(["CLOSED", "RESULTS_REVIEW", "PUBLISHED", "ARCHIVED"]);

function matchesFilter(status: string, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "active") return ACTIVE_STATUSES.has(status);
  if (f === "draft") return DRAFT_STATUSES.has(status);
  return CONCLUDED_STATUSES.has(status);
}

export default function ElectionsListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elections, setElections] = useState<ElectionDTO[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ elections: ElectionDTO[] }>("/api/elections");
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load elections");
      return;
    }
    setElections(res.data.elections);
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

  const filtered = elections.filter((e) => matchesFilter(e.status, filter));
  const counts = {
    all: elections.length,
    active: elections.filter((e) => ACTIVE_STATUSES.has(e.status)).length,
    draft: elections.filter((e) => DRAFT_STATUSES.has(e.status)).length,
    concluded: elections.filter((e) => CONCLUDED_STATUSES.has(e.status)).length,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Elections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage every election across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New election
          </Button>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              filter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                filter === f.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ElectionCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title={filter === "all" ? "No elections yet" : `No ${filter} elections`}
              description={
                filter === "all"
                  ? "Create your first election — we'll walk you through positions, candidates, voter import, and going live."
                  : `There are no elections in this state. Try another filter or create a new election.`
              }
              icon={Vote}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create election
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((el, i) => (
            <ElectionCard key={el.id} election={el} index={i} />
          ))}
        </div>
      )}

      <CreateElectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />

      <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
}

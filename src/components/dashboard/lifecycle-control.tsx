"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-fetch";
import { VALID_STATUS_TRANSITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Loader2,
  Pause,
  Play,
  Lock,
  CheckCircle2,
  Archive,
  AlertTriangle,
  Rocket,
  Flag,
} from "lucide-react";
import type { ElectionDTO } from "./types";

interface LifecycleControlProps {
  election: ElectionDTO;
  onTransitioned?: () => void;
  onActivationRequired?: () => void;
  compact?: boolean;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIGURATION: "Configuration",
  VOTER_IMPORT: "Voter import",
  CANDIDATE_SETUP: "Candidate setup",
  VERIFICATION: "Verification",
  READY: "Ready",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  PAUSED: "Paused",
  CLOSED: "Closed",
  RESULTS_REVIEW: "Results review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const DESTRUCTIVE_TARGETS = new Set(["CLOSED", "ARCHIVED"]);
const CRITICAL_TARGETS = new Set(["LIVE", "PUBLISHED"]);

const ICONS: Record<string, typeof ArrowRight> = {
  CONFIGURATION: ArrowRight,
  VOTER_IMPORT: ArrowRight,
  CANDIDATE_SETUP: ArrowRight,
  VERIFICATION: ArrowRight,
  READY: ArrowRight,
  SCHEDULED: Flag,
  LIVE: Play,
  PAUSED: Pause,
  CLOSED: Lock,
  RESULTS_REVIEW: CheckCircle2,
  PUBLISHED: CheckCircle2,
  ARCHIVED: Archive,
};

export function LifecycleControl({
  election,
  onTransitioned,
  onActivationRequired,
  compact = false,
  className,
}: LifecycleControlProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [activationPrompt, setActivationPrompt] = useState<string | null>(null);

  const allowed = VALID_STATUS_TRANSITIONS[election.status] ?? [];
  const isLive = election.status === "LIVE";

  async function runTransition(target: string) {
    setLoading(target);
    const res = await apiFetch<{ election?: ElectionDTO; activationRequired?: boolean; message?: string }>(
      `/api/elections/${election.id}/status`,
      { method: "POST", body: JSON.stringify({ status: target }) }
    );
    setLoading(null);

    if (!res.success) {
      toast.error(`Cannot transition to ${STATUS_LABELS[target] ?? target}`, {
        description: res.error?.message,
      });
      return;
    }

    if (res.data?.activationRequired) {
      setActivationPrompt(res.data.message ?? "Activation required to go live.");
      return;
    }

    toast.success(`Election moved to ${STATUS_LABELS[target] ?? target}`, {
      description: isLive && target === "PAUSED" ? "Voting paused." : undefined,
    });
    onTransitioned?.();
  }

  function onAction(target: string) {
    if (DESTRUCTIVE_TARGETS.has(target) || (CRITICAL_TARGETS.has(target) && target !== "LIVE")) {
      setPendingTarget(target);
      return;
    }
    if (target === "LIVE") {
      // Will check activationRequired from API; if required we surface a dialog
      runTransition(target);
      return;
    }
    runTransition(target);
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <Badge
            variant="outline"
            className={cn(
              "border-primary/30 bg-primary/10 text-primary",
              isLive && "border-emerald-400"
            )}
          >
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-emerald-500 text-emerald-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            {STATUS_LABELS[election.status] ?? election.status}
          </Badge>
        </div>

        {!compact && allowed.length > 0 && (
          <>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Next
            </span>
          </>
        )}

        {allowed.map((target) => {
          const Icon = ICONS[target] ?? ArrowRight;
          const isDestructive = DESTRUCTIVE_TARGETS.has(target);
          const isLoading = loading === target;
          return (
            <Tooltip key={target} delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isDestructive ? "outline" : target === "LIVE" ? "default" : "secondary"}
                  onClick={() => onAction(target)}
                  disabled={loading !== null}
                  className={cn(
                    isDestructive &&
                      "border-destructive/30 text-destructive hover:bg-destructive/10",
                    target === "LIVE" && "shadow-glow"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {STATUS_LABELS[target] ?? target}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Transition to {STATUS_LABELS[target] ?? target}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {allowed.length === 0 && !compact && (
          <span className="text-xs text-muted-foreground">No further transitions available.</span>
        )}
      </div>

      <AlertDialog
        open={!!pendingTarget}
        onOpenChange={(o) => !o && setPendingTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm {STATUS_LABELS[pendingTarget ?? ""] ?? pendingTarget}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTarget === "CLOSED" &&
                "Closing the election will stop all voting immediately. Voters will no longer be able to cast ballots. This action cannot be undone."}
              {pendingTarget === "ARCHIVED" &&
                "Archiving hides this election from active lists. Results remain auditable but the record becomes read-only."}
              {pendingTarget === "PUBLISHED" &&
                "Publishing makes results visible publicly via the results page and verify-ballot endpoints. Voters will be able to look up the outcome."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTarget) runTransition(pendingTarget);
                setPendingTarget(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!activationPrompt}
        onOpenChange={(o) => !o && setActivationPrompt(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Activation required
            </DialogTitle>
            <DialogDescription>{activationPrompt}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paid-plan elections must be activated (via payment or approved negotiation) before they can go LIVE.
            Visit the Activate tab to complete activation, then come back and transition to LIVE.
          </p>
          <DialogFooter>
            <Button asChild>
              <button
                onClick={() => {
                  setActivationPrompt(null);
                  onActivationRequired?.();
                }}
              >
                Go to Activate tab
              </button>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

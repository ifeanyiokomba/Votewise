import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Generic colored badge for enums that aren't election statuses
 * (StatusBadge covers election statuses). Maps values to a Tailwind palette
 * without using indigo/blue.
 */

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral:
    "bg-muted text-muted-foreground border-border",
  primary:
    "bg-primary/15 text-primary border-primary/30",
  success:
    "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  warning:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  danger:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  info: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
};

export function ColoredBadge({
  value,
  tone = "neutral",
  className,
  pulse,
}: {
  value: string;
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium capitalize",
        TONES[tone],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {value.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

// ── Tone maps ──────────────────────────────────────────────────────────

export const TICKET_STATUS_TONE: Record<string, Tone> = {
  OPEN: "primary",
  IN_PROGRESS: "info",
  WAITING: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const TICKET_PRIORITY_TONE: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const NOTIFICATION_STATUS_TONE: Record<string, Tone> = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  RETRIED: "warning",
};

export const SECURITY_SEVERITY_TONE: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const NEGOTIATION_STATUS_TONE: Record<string, Tone> = {
  REQUESTED: "neutral",
  UNDER_REVIEW: "info",
  IN_PROGRESS: "info",
  SETTLEMENT_PENDING: "warning",
  SETTLED: "primary",
  APPROVED: "success",
  DECLINED: "danger",
  CANCELLED: "neutral",
};

export const ROLE_TONE: Record<string, Tone> = {
  PLATFORM_ADMIN: "primary",
  ORG_OWNER: "primary",
  ORG_ADMIN: "info",
  ELECTION_MANAGER: "info",
  ELECTION_OFFICER: "neutral",
  OBSERVER: "neutral",
  AUDITOR: "neutral",
  VOTER: "neutral",
};

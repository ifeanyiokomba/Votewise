import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  CONFIGURATION: "bg-muted text-muted-foreground border-border",
  VOTER_IMPORT: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  CANDIDATE_SETUP: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  VERIFICATION: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  READY: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  SCHEDULED: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
  LIVE: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  PAUSED: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  CLOSED: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700",
  RESULTS_REVIEW: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  PUBLISHED: "bg-primary/15 text-primary border-primary/30",
  ARCHIVED: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const isLive = status === "LIVE";
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium capitalize", style, className)}
    >
      {isLive && (
        <span className="relative flex h-2 w-2 text-emerald-500">
          <span className="pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

"use client";

import { cn, formatNumber } from "@/lib/utils";
import type { TimelinePoint } from "./types";

interface VoteTimelineProps {
  timeline: TimelinePoint[];
  className?: string;
}

export function VoteTimeline({ timeline, className }: VoteTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-lg border border-dashed py-12 text-center text-xs text-muted-foreground",
          className
        )}
      >
        No votes cast yet — timeline fills as ballots are submitted.
      </div>
    );
  }

  const max = Math.max(...timeline.map((t) => t.count), 1);
  const total = timeline.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end gap-1 sm:gap-1.5" style={{ height: 140 }}>
        {timeline.map((point, i) => {
          const heightPct = (point.count / max) * 100;
          const date = new Date(point.hour + ":00:00Z");
          const label = date.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const isLast = i === timeline.length - 1;
          return (
            <div
              key={point.hour}
              className="group relative flex flex-1 flex-col items-center justify-end gap-1"
              style={{ height: "100%" }}
              title={`${label} — ${point.count} vote(s)`}
            >
              <div className="absolute -top-5 z-10 hidden rounded-md border bg-popover px-1.5 py-0.5 text-[10px] font-medium shadow-sm group-hover:block">
                {point.count}
              </div>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all",
                  isLast
                    ? "bg-primary"
                    : "bg-primary/60 group-hover:bg-primary/80"
                )}
                style={{
                  height: `${Math.max(heightPct, 3)}%`,
                  minHeight: 4,
                }}
              />
              {(timeline.length <= 12 || i % Math.ceil(timeline.length / 8) === 0) && (
                <span className="text-[9px] text-muted-foreground">{label}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatNumber(total)} total votes</span>
        <span>{timeline.length} hour bucket(s)</span>
      </div>
    </div>
  );
}

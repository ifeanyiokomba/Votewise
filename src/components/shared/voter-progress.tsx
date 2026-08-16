"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

export type VoterStep = "verify" | "vote" | "confirm" | "receipt";

const STEPS: { id: VoterStep; label: string }[] = [
  { id: "verify", label: "Verify" },
  { id: "vote", label: "Vote" },
  { id: "confirm", label: "Confirm" },
  { id: "receipt", label: "Receipt" },
];

const ORDER: VoterStep[] = ["verify", "vote", "confirm", "receipt"];

/**
 * Compact horizontal progress strip used at the top of every voter screen.
 * `current` is the step the voter is on; earlier steps show a checkmark.
 */
export function VoterProgress({
  current,
  className,
}: {
  current: VoterStep;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const currentIdx = ORDER.indexOf(current);

  return (
    <nav
      aria-label="Voting progress"
      className={cn("w-full", className)}
    >
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const dotBase =
            "relative grid size-8 place-items-center rounded-full border text-xs font-semibold transition-colors";
          const dotClass = done
            ? "border-primary bg-primary text-primary-foreground"
            : active
              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
              : "border-border bg-background text-muted-foreground";

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center gap-1 sm:gap-2"
              aria-current={active ? "step" : undefined}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(dotBase, dotClass)}>
                  {done ? (
                    <Check className="size-4" />
                  ) : reduce ? (
                    idx + 1
                  ) : (
                    <motion.span
                      key={active ? "active" : "idle"}
                      initial={{ scale: 0.85 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {idx + 1}
                    </motion.span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide sm:text-xs",
                    active
                      ? "text-foreground"
                      : done
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="relative mx-1 h-px flex-1 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary transition-all duration-500",
                      idx < currentIdx ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

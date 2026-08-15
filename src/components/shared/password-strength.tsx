"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordScore = {
  score: 0 | 1 | 2 | 3;
  label: "Empty" | "Weak" | "Fair" | "Strong";
  checks: { id: string; label: string; met: boolean }[];
};

export function scorePassword(pw: string): PasswordScore {
  const length = pw.length >= 8;
  const upper = /[A-Z]/.test(pw);
  const number = /[0-9]/.test(pw);
  const symbol = /[^A-Za-z0-9]/.test(pw);
  const checks = [
    { id: "len", label: "At least 8 characters", met: length },
    { id: "upper", label: "One uppercase letter", met: upper },
    { id: "num", label: "One number", met: number },
  ];

  const met = [length, upper, number, symbol].filter(Boolean).length;
  let score: PasswordScore["score"] = 0;
  let label: PasswordScore["label"] = "Empty";
  if (pw.length === 0) {
    score = 0;
    label = "Empty";
  } else if (met <= 1 || (length && !upper && !number)) {
    score = 1;
    label = "Weak";
  } else if (met === 2 || (length && upper && number && !symbol)) {
    score = 2;
    label = "Fair";
  } else {
    score = 3;
    label = "Strong";
  }
  return { score, label, checks };
}

const BAR_COLOR = ["bg-muted", "bg-destructive", "bg-warning", "bg-success"];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = scorePassword(password);
  return (
    <div
      className="flex items-center gap-2"
      aria-live="polite"
      aria-label={`Password strength: ${label}`}
    >
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              password.length === 0
                ? "bg-muted"
                : i <= score
                ? BAR_COLOR[score]
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "min-w-[3rem] text-right text-xs font-medium tabular-nums",
          password.length === 0
            ? "text-muted-foreground"
            : score === 1
            ? "text-destructive"
            : score === 2
            ? "text-warning-foreground"
            : "text-success"
        )}
      >
        {password.length === 0 ? "" : label}
      </span>
    </div>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  const { checks } = scorePassword(password);
  return (
    <ul className="mt-2 space-y-1.5" aria-label="Password requirements">
      {checks.map((c) => (
        <li
          key={c.id}
          className={cn(
            "flex items-center gap-2 text-xs transition-colors",
            c.met ? "text-success" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "grid size-4 place-items-center rounded-full border",
              c.met
                ? "border-success bg-success/10 text-success"
                : "border-muted-foreground/40 text-transparent"
            )}
          >
            {c.met ? <Check className="size-3" /> : <X className="size-3 opacity-0" />}
          </span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}

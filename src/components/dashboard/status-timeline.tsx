"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FileText,
  Settings,
  Users,
  UserSquare2,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Radio,
  Pause,
  XCircle,
  BarChart3,
  Globe,
  Archive,
} from "lucide-react";

const STATUS_STEPS = [
  { status: "DRAFT", label: "Draft", icon: FileText, description: "Election created" },
  { status: "CONFIGURATION", label: "Configuration", icon: Settings, description: "Setting up details" },
  { status: "VOTER_IMPORT", label: "Voter Import", icon: Users, description: "Adding voters" },
  { status: "CANDIDATE_SETUP", label: "Candidates", icon: UserSquare2, description: "Adding candidates" },
  { status: "VERIFICATION", label: "Verification", icon: ShieldCheck, description: "OTP verification" },
  { status: "READY", label: "Ready", icon: CheckCircle2, description: "Ready to go live" },
  { status: "SCHEDULED", label: "Scheduled", icon: Calendar, description: "Start time set" },
  { status: "LIVE", label: "Live", icon: Radio, description: "Voting in progress" },
  { status: "PAUSED", label: "Paused", icon: Pause, description: "Temporarily halted" },
  { status: "CLOSED", label: "Closed", icon: XCircle, description: "Voting ended" },
  { status: "RESULTS_REVIEW", label: "Results Review", icon: BarChart3, description: "Reviewing results" },
  { status: "PUBLISHED", label: "Published", icon: Globe, description: "Results public" },
  { status: "ARCHIVED", label: "Archived", icon: Archive, description: "Election archived" },
];

export function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_STEPS.findIndex((s) => s.status === currentStatus);
  const isPaused = currentStatus === "PAUSED";

  // For PAUSED, show up to LIVE as reached
  const reachedIndex = isPaused
    ? STATUS_STEPS.findIndex((s) => s.status === "LIVE")
    : currentIndex;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Lifecycle timeline
        </CardTitle>
        <CardDescription className="text-xs">
          Visual journey of this election through its lifecycle stages
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex overflow-x-auto scroll-area-custom pb-2">
          <div className="flex min-w-full items-start gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const isReached = idx <= reachedIndex;
              const isCurrent = idx === currentIndex;
              const isPausedStep = isPaused && step.status === "PAUSED";
              const Icon = step.icon;

              return (
                <div key={step.status} className="flex items-start">
                  {/* Step */}
                  <div className="flex flex-col items-center gap-1.5" style={{ minWidth: "80px" }}>
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full border-2 transition-all",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-glow scale-110"
                          : isReached
                            ? isPausedStep
                              ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted/50 text-muted-foreground/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {/* Label */}
                    <div className="text-center">
                      <p
                        className={cn(
                          "text-[10px] font-medium",
                          isCurrent
                            ? "text-primary"
                            : isReached
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="hidden text-[9px] text-muted-foreground/50 sm:block">
                        {step.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-primary px-1.5 py-0 text-[8px] font-bold uppercase text-primary-foreground">
                        Current
                      </span>
                    )}
                  </div>
                  {/* Connector line */}
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className="relative mt-4 h-0.5 w-6 sm:w-8">
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full",
                          idx < reachedIndex
                            ? "bg-primary"
                            : "bg-border"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

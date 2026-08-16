"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

interface Announcement {
  id: string;
  subject: string;
  body: string;
  metadata: string | null;
  createdAt: string;
}

interface ParsedAnnouncement extends Announcement {
  type: string;
}

export function AnnouncementBanner({ electionId }: { electionId: string }) {
  const [announcements, setAnnouncements] = useState<ParsedAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const res = await apiFetch<{ announcements: Announcement[] }>(
        `/api/public/announcements/${electionId}`
      );
      if (cancelled) return;
      if (res.success && res.data) {
        const parsed = res.data.announcements.map((a) => {
          let meta: Record<string, unknown> = {};
          try { meta = JSON.parse(a.metadata ?? "{}"); } catch { /* ignore */ }
          return { ...a, type: (meta.announcementType as string) ?? "info" };
        });
        setAnnouncements(parsed);
      }
    })();
    return () => { cancelled = true; };
  }, [electionId]);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const typeConfig: Record<string, { icon: typeof Info; className: string; iconColor: string }> = {
    info: { icon: Info, className: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200", iconColor: "text-sky-500" },
    warning: { icon: AlertTriangle, className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200", iconColor: "text-amber-500" },
    success: { icon: CheckCircle2, className: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200", iconColor: "text-emerald-500" },
    urgent: { icon: AlertCircle, className: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200", iconColor: "text-red-500" },
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map((a) => {
          const config = typeConfig[a.type] ?? typeConfig.info;
          const Icon = config.icon;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn("relative flex items-start gap-3 rounded-xl border p-4", config.className)}
            >
              <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconColor)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.subject}</p>
                <p className="mt-0.5 text-xs">{a.body}</p>
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
                className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

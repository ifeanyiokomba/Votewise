"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatRelative } from "@/lib/utils";
import {
  Vote,
  UserCheck,
  ScrollText,
  Radio,
  Activity,
  ShieldCheck,
} from "lucide-react";

interface AuditLogDTO {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  result: string | null;
  timestamp: string;
  actor?: { name: string } | null;
}

export interface OrgActivityItem {
  id: string;
  type: "vote" | "verification" | "audit" | "security" | "election";
  title: string;
  electionName: string | null;
  timestamp: string;
}

export interface OrgDashboardStats {
  organizationId: string;
  totalVoters: number;
  totalVotes: number;
  activeElections: number;
  liveElections: number;
  verifiedVoters: number;
  timestamp: string;
}

const TYPE_CONFIG: Record<
  OrgActivityItem["type"],
  { icon: typeof Vote; color: string; bg: string }
> = {
  vote: {
    icon: Vote,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  verification: {
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  audit: {
    icon: ScrollText,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  security: {
    icon: ShieldCheck,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  election: {
    icon: Activity,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
};

export function LiveActivityFeed({
  organizationId,
}: {
  organizationId: string;
}) {
  const [activity, setActivity] = useState<OrgActivityItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<OrgDashboardStats | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    // Fetch initial activity via HTTP as a fallback (works even without socket)
    apiFetch<{ recentAudit: AuditLogDTO[] }>("/api/admin/stats").then((res) => {
      if (res.success && res.data?.recentAudit) {
        const items: OrgActivityItem[] = res.data.recentAudit.slice(0, 10).map((log) => ({
          id: `audit-${log.id}`,
          type: "audit" as const,
          title: log.action.replace(/_/g, " ").toLowerCase(),
          electionName: null,
          timestamp: log.timestamp,
        }));
        // Only set if socket hasn't already populated
        setActivity((prev) => (prev.length > 0 ? prev : items));
      }
    });

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("subscribe:org", organizationId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("org:activity", (items: OrgActivityItem[]) => {
      setActivity(items);
    });
    socket.on("org:stats", (s: OrgDashboardStats) => {
      setStats(s);
    });

    return () => {
      socket.emit("unsubscribe:org", organizationId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [organizationId]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio
                className={cn(
                  "h-4 w-4",
                  connected ? "text-primary animate-pulse" : "text-muted-foreground"
                )}
              />
              Live activity
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time events across your organization
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              connected
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "text-muted-foreground"
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              {connected && (
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  connected ? "bg-emerald-500" : "bg-muted-foreground"
                )}
              />
            </span>
            {connected ? "Live" : "Connecting"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs text-muted-foreground">
              Events will appear here in real time as they happen.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[28rem] scroll-area-custom">
            <ol className="relative px-4 py-3">
              {activity.map((item, idx) => {
                const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.audit;
                const Icon = config.icon;
                const isFirst = idx === 0;
                return (
                  <li
                    key={item.id}
                    className="relative flex gap-3 pb-4 last:pb-0"
                  >
                    {/* Timeline line */}
                    {idx < activity.length - 1 && (
                      <span
                        className="absolute left-[15px] top-8 h-full w-px bg-border"
                        aria-hidden
                      />
                    )}
                    <div
                      className={cn(
                        "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                        config.bg,
                        config.color,
                        "border-transparent",
                        isFirst && connected && "ring-2 ring-primary/20"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium capitalize">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatRelative(item.timestamp)}
                        </span>
                      </div>
                      {item.electionName && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.electionName}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

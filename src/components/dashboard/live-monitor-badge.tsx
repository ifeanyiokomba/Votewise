"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Activity, Radio } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export interface LiveElectionStats {
  electionId: string;
  electionName: string;
  status: string;
  voters: number;
  verified: number;
  completedVotes: number;
  activeSessions: number;
  candidates: number;
  positions: number;
  turnout: number;
  verificationRate: number;
  timestamp: string;
}

/**
 * Subscribe to the Votewise monitor mini-service (socket.io on :3003) for
 * real-time election stats. Returns the latest stats + connection state.
 */
export function useElectionLiveStats(electionId: string | null | undefined) {
  const [stats, setStats] = useState<LiveElectionStats | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!electionId) return;
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("subscribe:election", electionId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("election:stats", (data: LiveElectionStats) => {
      if (data && data.electionId === electionId) setStats(data);
    });

    return () => {
      socket.emit("unsubscribe:election", electionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [electionId]);

  return { stats, connected };
}

export function LiveMonitorBadge({
  electionId,
  status,
}: {
  electionId: string;
  status: string;
}) {
  const { stats, connected } = useElectionLiveStats(electionId);

  // Only show the live monitor for active elections
  if (!["LIVE", "SCHEDULED", "READY", "PAUSED"].includes(status)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={
          connected
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-muted-foreground/30 text-muted-foreground"
        }
        title={connected ? "Real-time monitor connected" : "Connecting to live monitor…"}
      >
        {connected ? (
          <Radio className="h-3 w-3 animate-pulse" />
        ) : (
          <Activity className="h-3 w-3" />
        )}
        {connected ? "Live" : "Connecting"}
      </Badge>
      {stats && (
        <>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Activity className="h-3 w-3 text-primary" />
            {formatNumber(stats.completedVotes)} votes
          </Badge>
          {status === "LIVE" && stats.activeSessions > 0 && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary"
              title="Voters currently on the ballot"
            >
              {formatNumber(stats.activeSessions)} active
            </Badge>
          )}
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            {stats.verified}/{stats.voters} verified
          </Badge>
        </>
      )}
    </div>
  );
}

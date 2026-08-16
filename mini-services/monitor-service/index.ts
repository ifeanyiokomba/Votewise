import { createServer } from "http";
import { Server } from "socket.io";
import { Database } from "bun:sqlite";

const PORT = 3003;
const DB_PATH = "/home/z/my-project/db/custom.db";

// Open read-only connection to the shared Prisma SQLite DB.
const sqlite = new Database(DB_PATH, { readonly: true });

interface ElectionStats {
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

function getElectionStats(electionId: string): ElectionStats | null {
  const election = sqlite
    .query(`SELECT id, name, status FROM Election WHERE id = ?`)
    .get(electionId as never) as
    | { id: string; name: string; status: string }
    | null;
  if (!election) return null;

  const count = (sql: string) => {
    const row = sqlite.query(sql).get(electionId as never) as { c: number } | null;
    return row?.c ?? 0;
  };

  const voters = count(`SELECT COUNT(*) as c FROM Voter WHERE electionId = ?`);
  const verified = count(
    `SELECT COUNT(*) as c FROM VerificationAttempt WHERE electionId = ? AND status = 'VERIFIED'`
  );
  const completedVotes = count(
    `SELECT COUNT(*) as c FROM Vote WHERE electionId = ? AND status = 'CAST'`
  );
  const activeSessions = count(
    `SELECT COUNT(*) as c FROM VotingSession WHERE electionId = ? AND isActive = 1`
  );
  const candidates = count(`SELECT COUNT(*) as c FROM Candidate WHERE electionId = ?`);
  const positions = count(`SELECT COUNT(*) as c FROM Position WHERE electionId = ?`);

  return {
    electionId: election.id,
    electionName: election.name,
    status: election.status,
    voters,
    verified,
    completedVotes,
    activeSessions,
    candidates,
    positions,
    turnout: voters > 0 ? (completedVotes / voters) * 100 : 0,
    verificationRate: voters > 0 ? (verified / voters) * 100 : 0,
    timestamp: new Date().toISOString(),
  };
}

// Recent vote activity (for a live feed), without exposing voter identity.
interface VoteFeedItem {
  time: string;
  count: number;
}
function getRecentVoteFeed(electionId: string, limit = 20): VoteFeedItem[] {
  const rows = sqlite
    .query(
      `SELECT castAt as time, COUNT(*) as count FROM Vote
       WHERE electionId = ? AND status = 'CAST'
       GROUP BY strftime('%Y-%m-%dT%H:%M', castAt)
       ORDER BY time DESC LIMIT ?`
    )
    .all(electionId as never, limit as never) as VoteFeedItem[];
  return rows;
}

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// electionId -> Set<socketId>
const subscribers = new Map<string, Set<string>>();
// organizationId -> Set<socketId> (for org-wide dashboard feeds)
const orgSubscribers = new Map<string, Set<string>>();

interface OrgActivityItem {
  id: string;
  type: "vote" | "verification" | "audit" | "security" | "election";
  title: string;
  electionName: string | null;
  timestamp: string;
}

function getOrgActivity(organizationId: string, limit = 15): OrgActivityItem[] {
  // Recent votes across the org
  const votes = sqlite
    .query(
      `SELECT v.id, v.castAt as timestamp, e.name as electionName
       FROM Vote v
       JOIN Election e ON e.id = v.electionId
       WHERE e.organizationId = ? AND v.status = 'CAST'
       ORDER BY v.castAt DESC LIMIT ?`
    )
    .all(organizationId as never, limit as never) as {
      id: string;
      timestamp: string;
      electionName: string;
    }[];

  // Recent verifications
  const verifications = sqlite
    .query(
      `SELECT va.id, va.createdAt as timestamp, e.name as electionName
       FROM VerificationAttempt va
       JOIN Election e ON e.id = va.electionId
       WHERE e.organizationId = ? AND va.status = 'VERIFIED'
       ORDER BY va.createdAt DESC LIMIT ?`
    )
    .all(organizationId as never, limit as never) as {
      id: string;
      timestamp: string;
      electionName: string;
    }[];

  // Recent audit logs
  const audits = sqlite
    .query(
      `SELECT id, action, resource, timestamp, resourceId
       FROM AuditLog
       WHERE organizationId = ?
       ORDER BY timestamp DESC LIMIT ?`
    )
    .all(organizationId as never, limit as never) as {
      id: string;
      action: string;
      resource: string;
      timestamp: string;
      resourceId: string;
    }[];

  const items: OrgActivityItem[] = [
    ...votes.map((v) => ({
      id: `vote-${v.id}`,
      type: "vote" as const,
      title: "Ballot cast",
      electionName: v.electionName,
      timestamp: v.timestamp,
    })),
    ...verifications.map((v) => ({
      id: `ver-${v.id}`,
      type: "verification" as const,
      title: "Voter verified via OTP",
      electionName: v.electionName,
      timestamp: v.timestamp,
    })),
    ...audits.map((a) => ({
      id: `audit-${a.id}`,
      type: "audit" as const,
      title: a.action.replace(/_/g, " ").toLowerCase(),
      electionName: null,
      timestamp: a.timestamp,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

interface OrgDashboardStats {
  organizationId: string;
  totalVoters: number;
  totalVotes: number;
  activeElections: number;
  liveElections: number;
  verifiedVoters: number;
  timestamp: string;
}

function getOrgDashboardStats(organizationId: string): OrgDashboardStats {
  const count = (sql: string) => {
    const row = sqlite.query(sql).get(organizationId as never) as { c: number } | null;
    return row?.c ?? 0;
  };

  const totalVoters = count(
    `SELECT COUNT(*) as c FROM Voter WHERE organizationId = ?`
  );
  const totalVotes = count(
    `SELECT COUNT(*) as c FROM Vote v JOIN Election e ON e.id = v.electionId WHERE e.organizationId = ? AND v.status = 'CAST'`
  );
  const activeElections = count(
    `SELECT COUNT(*) as c FROM Election WHERE organizationId = ? AND status NOT IN ('CLOSED','PUBLISHED','ARCHIVED')`
  );
  const liveElections = count(
    `SELECT COUNT(*) as c FROM Election WHERE organizationId = ? AND status = 'LIVE'`
  );
  const verifiedVoters = count(
    `SELECT COUNT(DISTINCT va.voterId) as c FROM VerificationAttempt va JOIN Election e ON e.id = va.electionId WHERE e.organizationId = ? AND va.status = 'VERIFIED'`
  );

  return {
    organizationId,
    totalVoters,
    totalVotes,
    activeElections,
    liveElections,
    verifiedVoters,
    timestamp: new Date().toISOString(),
  };
}

function broadcast(electionId: string) {
  const stats = getElectionStats(electionId);
  const feed = getRecentVoteFeed(electionId);
  const subs = subscribers.get(electionId);
  if (!subs) return;
  for (const socketId of subs) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("election:stats", stats);
      socket.emit("election:feed", feed);
    }
  }
}

function broadcastOrg(organizationId: string) {
  const stats = getOrgDashboardStats(organizationId);
  const activity = getOrgActivity(organizationId, 15);
  const subs = orgSubscribers.get(organizationId);
  if (!subs) return;
  for (const socketId of subs) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("org:stats", stats);
      socket.emit("org:activity", activity);
    }
  }
}

// Polling loop — every 3 seconds, broadcast to all subscribed elections + orgs.
setInterval(() => {
  for (const electionId of subscribers.keys()) {
    try {
      broadcast(electionId);
    } catch (e) {
      console.error("[monitor] election broadcast error", e);
    }
  }
  for (const organizationId of orgSubscribers.keys()) {
    try {
      broadcastOrg(organizationId);
    } catch (e) {
      console.error("[monitor] org broadcast error", e);
    }
  }
}, 3000);

io.on("connection", (socket) => {
  console.log(`[monitor] client connected: ${socket.id}`);

  socket.on("subscribe:election", (electionId: string) => {
    if (!electionId) return;
    socket.data.electionId = electionId;
    if (!subscribers.has(electionId)) subscribers.set(electionId, new Set());
    subscribers.get(electionId)!.add(socket.id);
    console.log(`[monitor] ${socket.id} subscribed to election ${electionId}`);
    // Immediate snapshot
    const stats = getElectionStats(electionId);
    if (stats) socket.emit("election:stats", stats);
    socket.emit("election:feed", getRecentVoteFeed(electionId));
  });

  socket.on("subscribe:org", (organizationId: string) => {
    if (!organizationId) return;
    socket.data.organizationId = organizationId;
    if (!orgSubscribers.has(organizationId)) orgSubscribers.set(organizationId, new Set());
    orgSubscribers.get(organizationId)!.add(socket.id);
    console.log(`[monitor] ${socket.id} subscribed to org ${organizationId}`);
    // Immediate snapshot
    socket.emit("org:stats", getOrgDashboardStats(organizationId));
    socket.emit("org:activity", getOrgActivity(organizationId, 15));
  });

  socket.on("unsubscribe:election", (electionId: string) => {
    const subs = subscribers.get(electionId);
    if (subs) {
      subs.delete(socket.id);
      if (subs.size === 0) subscribers.delete(electionId);
    }
  });

  socket.on("unsubscribe:org", (organizationId: string) => {
    const subs = orgSubscribers.get(organizationId);
    if (subs) {
      subs.delete(socket.id);
      if (subs.size === 0) orgSubscribers.delete(organizationId);
    }
  });

  socket.on("disconnect", () => {
    const electionId = socket.data.electionId as string | undefined;
    if (electionId) {
      const subs = subscribers.get(electionId);
      if (subs) {
        subs.delete(socket.id);
        if (subs.size === 0) subscribers.delete(electionId);
      }
    }
    const organizationId = socket.data.organizationId as string | undefined;
    if (organizationId) {
      const subs = orgSubscribers.get(organizationId);
      if (subs) {
        subs.delete(socket.id);
        if (subs.size === 0) orgSubscribers.delete(organizationId);
      }
    }
    console.log(`[monitor] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✓ Votewise monitor service listening on :${PORT}`);
});

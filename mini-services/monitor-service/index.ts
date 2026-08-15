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

// Polling loop — every 3 seconds, broadcast to all subscribed elections.
setInterval(() => {
  for (const electionId of subscribers.keys()) {
    try {
      broadcast(electionId);
    } catch (e) {
      console.error("[monitor] broadcast error", e);
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

  socket.on("unsubscribe:election", (electionId: string) => {
    const subs = subscribers.get(electionId);
    if (subs) {
      subs.delete(socket.id);
      if (subs.size === 0) subscribers.delete(electionId);
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
    console.log(`[monitor] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✓ Votewise monitor service listening on :${PORT}`);
});

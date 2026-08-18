import { createServer } from "http";
import { Server } from "socket.io";

/**
 * Votewise Monitor Service (VW-006 Fixed)
 *
 * SECURITY: This service no longer connects directly to the database.
 * It polls the main app's public API for election stats and broadcasts
 * them to authenticated websocket clients.
 *
 * Authentication: Clients must send a valid JWT session token in the
 * `auth` field of the socket connection. The token is verified by
 * calling the main app's /api/auth/me endpoint.
 *
 * CORS: Restricted to the main app domain only.
 */

const PORT = 3003;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://votewise.com.ng";
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://votewise.com.ng";
const POLL_INTERVAL_MS = 5_000;

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: [ALLOWED_ORIGIN, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Track subscribed elections: electionId -> Set<socketId>
const electionSubscriptions = new Map<string, Set<string>>();
// Track subscribed orgs: orgId -> Set<socketId>
const orgSubscriptions = new Map<string, Set<string>>();

// ─── Auth middleware ─────────────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    // Verify the token by calling the main app's auth endpoint
    const response = await fetch(`${APP_URL}/api/auth/me`, {
      headers: {
        Cookie: `votewise_session=${token}`,
      },
    });

    if (!response.ok) {
      return next(new Error("Invalid or expired session"));
    }

    const data = await response.json();
    if (!data.success || !data.data?.user) {
      return next(new Error("Invalid session"));
    }

    // Attach user info to socket for authorization checks
    socket.data.user = data.data.user;
    socket.data.organizationId = data.data.organization?.id ?? null;
    next();
  } catch {
    return next(new Error("Session verification failed"));
  }
});

io.on("connection", (socket) => {
  console.log(`[monitor] connected: ${socket.id} (user: ${socket.data.user?.email ?? "unknown"})`);

  // Subscribe to election updates
  socket.on("subscribe:election", (electionId: string) => {
    if (!electionSubscriptions.has(electionId)) {
      electionSubscriptions.set(electionId, new Set());
    }
    electionSubscriptions.get(electionId)!.add(socket.id);
    socket.join(`election:${electionId}`);
    console.log(`[monitor] ${socket.id} subscribed to election ${electionId}`);
  });

  // Unsubscribe
  socket.on("unsubscribe:election", (electionId: string) => {
    electionSubscriptions.get(electionId)?.delete(socket.id);
    socket.leave(`election:${electionId}`);
  });

  // Subscribe to org-wide updates
  socket.on("subscribe:org", (orgId: string) => {
    // Only allow subscribing to your own org
    if (socket.data.organizationId !== orgId && socket.data.user?.role !== "PLATFORM_ADMIN") {
      socket.emit("error", { message: "Not authorized to subscribe to this organization" });
      return;
    }
    if (!orgSubscriptions.has(orgId)) {
      orgSubscriptions.set(orgId, new Set());
    }
    orgSubscriptions.get(orgId)!.add(socket.id);
    socket.join(`org:${orgId}`);
    console.log(`[monitor] ${socket.id} subscribed to org ${orgId}`);
  });

  socket.on("unsubscribe:org", (orgId: string) => {
    orgSubscriptions.get(orgId)?.delete(socket.id);
    socket.leave(`org:${orgId}`);
  });

  socket.on("disconnect", () => {
    // Clean up subscriptions
    for (const [electionId, sockets] of electionSubscriptions) {
      sockets.delete(socket.id);
      if (sockets.size === 0) electionSubscriptions.delete(electionId);
    }
    for (const [orgId, sockets] of orgSubscriptions) {
      sockets.delete(socket.id);
      if (sockets.size === 0) orgSubscriptions.delete(orgId);
    }
    console.log(`[monitor] disconnected: ${socket.id}`);
  });
});

// ─── Poll for stats and broadcast ────────────────────────────────
async function pollAndBroadcast() {
  // Poll each subscribed election
  for (const [electionId, sockets] of electionSubscriptions) {
    if (sockets.size === 0) continue;

    try {
      const response = await fetch(`${APP_URL}/api/public/results/${electionId}`);
      if (!response.ok) continue;
      const data = await response.json();

      if (data.success && data.data) {
        io.to(`election:${electionId}`).emit("election:stats", {
          electionId,
          status: data.data.election?.status ?? data.data.status,
          electionName: data.data.election?.name ?? data.data.electionName,
          liveStats: data.data.liveStats ?? null,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Skip on error
    }
  }
}

setInterval(() => {
  pollAndBroadcast().catch((e) =>
    console.error("[monitor] poll error:", e instanceof Error ? e.message : e)
  );
}, POLL_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`✓ Votewise monitor service listening on :${PORT}`);
  console.log(`  CORS origins: ${[ALLOWED_ORIGIN, "http://localhost:3000"].join(", ")}`);
  console.log(`  Auth: JWT session token required via socket.auth.token`);
});

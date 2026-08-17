import { createServer } from "http";
import { Server } from "socket.io";

// ─────────────────────────────────────────────────────────────────────
// Votewise Support Chat — Socket.io mini-service
// Real-time voter ↔ admin/member chat with 5-minute timeout & recording.
// Uses in-memory state (no external DB dependency).
// ─────────────────────────────────────────────────────────────────────

const PORT = 3004;

// In-memory data stores
interface SessionRow {
  id: string;
  voterId: string;
  electionId: string | null;
  voterName: string;
  voterSocket: string | null;
  adminSocket: string | null;
  adminId: string | null;
  adminName: string | null;
  status: "open" | "assigned" | "timeout" | "closed";
  lastVoterMessageAt: string | null;
  lastAdminMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessageRow {
  id: string;
  sessionId: string;
  senderType: "voter" | "admin" | "system";
  senderId: string | null;
  senderName: string | null;
  body: string;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

const sessions = new Map<string, SessionRow>();
const messages = new Map<string, MessageRow[]>(); // sessionId -> messages
const voterSockets = new Map<string, { sessionId: string; voterId: string; voterName: string }>(); // socketId -> voter
const adminSockets = new Map<string, { adminId: string; adminName: string }>(); // socketId -> admin
const sessionTimers = new Map<string, NodeJS.Timeout>(); // sessionId -> timer

const FIVE_MINUTES = 5 * 60 * 1000;

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

function nowISO() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Get the list of open/assigned/timeout sessions for admins (with last message preview + count)
function getSessionsForAdmin() {
  const list: any[] = [];
  for (const s of sessions.values()) {
    if (s.status === "closed") continue;
    const msgs = messages.get(s.id) ?? [];
    const lastVoterMsg = [...msgs].reverse().find((m) => m.senderType === "voter");
    list.push({
      id: s.id,
      voterId: s.voterId,
      voterName: s.voterName,
      electionId: s.electionId,
      status: s.status,
      adminName: s.adminName,
      lastMessage: lastVoterMsg?.body ?? null,
      messageCount: msgs.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
  }
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return list.slice(0, 50);
}

function notifyAdminsOfSessions() {
  io.to("admins").emit("sessions:update", getSessionsForAdmin());
}

function pushMessage(sessionId: string, msg: Omit<MessageRow, "id" | "sessionId" | "createdAt"> & Partial<Pick<MessageRow, "id" | "createdAt">>) {
  const full: MessageRow = {
    id: msg.id ?? genId("msg"),
    sessionId,
    senderType: msg.senderType,
    senderId: msg.senderId,
    senderName: msg.senderName,
    body: msg.body,
    fileUrl: msg.fileUrl ?? null,
    fileName: msg.fileName ?? null,
    createdAt: msg.createdAt ?? nowISO(),
  };
  const arr = messages.get(sessionId) ?? [];
  arr.push(full);
  messages.set(sessionId, arr);
  return full;
}

function resetTimeoutTimer(sessionId: string) {
  const existing = sessionTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const s = sessions.get(sessionId);
    if (!s || s.status !== "assigned") {
      sessionTimers.delete(sessionId);
      return;
    }
    // Admin hasn't responded in 5 minutes — reopen session for other admins
    s.status = "timeout";
    s.adminSocket = null;
    s.adminId = null;
    s.adminName = null;
    s.updatedAt = nowISO();
    sessions.set(sessionId, s);

    pushMessage(sessionId, {
      senderType: "system",
      senderId: null,
      senderName: "System",
      body: "Support agent unavailable. Opening session for the next available agent.",
    });

    io.to(`session_${sessionId}`).emit("admin:left", {
      message: "Your support agent is no longer available. Another agent will assist you shortly.",
    });

    io.to(`session_${sessionId}`).emit("message:new", {
      id: genId("msg"),
      sessionId,
      senderType: "system",
      senderName: "System",
      body: "Support agent unavailable. Opening session for the next available agent.",
      fileUrl: null,
      fileName: null,
      createdAt: nowISO(),
    });

    // Make voter leave the session room so a new admin can claim exclusively
    io.in(`session_${sessionId}`).socketsLeave(`session_${sessionId}`);
    if (s.voterSocket) {
      io.to(s.voterSocket).emit("session:reopened", { sessionId });
      // Voter rejoins so they still receive messages
      io.to(s.voterSocket).socketsJoin(`session_${sessionId}`);
    }

    sessionTimers.delete(sessionId);
    notifyAdminsOfSessions();
    console.log(`[support-chat] Session ${sessionId} timed out — reopened for other admins`);
  }, FIVE_MINUTES);

  sessionTimers.set(sessionId, timer);
}

io.on("connection", (socket) => {
  console.log(`[support-chat] connected: ${socket.id}`);

  // ─── Voter connects ─────────────────────────────────────────
  socket.on("voter:join", (data: { voterId: string; voterName: string; electionId?: string }) => {
    // Look for an existing open/assigned/timeout session for this voter
    let existing: SessionRow | undefined;
    for (const s of sessions.values()) {
      if (s.voterId === data.voterId && s.status !== "closed") {
        existing = s;
        break;
      }
    }

    let sid: string;
    if (existing) {
      sid = existing.id;
      existing.voterSocket = socket.id;
      if (existing.status === "closed") existing.status = "open";
      existing.updatedAt = nowISO();
      sessions.set(sid, existing);
    } else {
      sid = genId("chat");
      const newSession: SessionRow = {
        id: sid,
        voterId: data.voterId,
        electionId: data.electionId ?? null,
        voterName: data.voterName,
        voterSocket: socket.id,
        adminSocket: null,
        adminId: null,
        adminName: null,
        status: "open",
        lastVoterMessageAt: null,
        lastAdminMessageAt: null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      sessions.set(sid, newSession);
      messages.set(sid, []);
    }

    voterSockets.set(socket.id, { sessionId: sid, voterId: data.voterId, voterName: data.voterName });
    socket.join(`session_${sid}`);
    socket.emit("session:created", { sessionId: sid });

    // Send message history
    socket.emit("messages:history", messages.get(sid) ?? []);

    notifyAdminsOfSessions();
  });

  // ─── Voter sends message ────────────────────────────────────
  socket.on("voter:message", (data: { body: string; fileUrl?: string; fileName?: string }) => {
    const voter = voterSockets.get(socket.id);
    if (!voter) return;
    const s = sessions.get(voter.sessionId);
    if (!s) return;

    const msg = pushMessage(voter.sessionId, {
      senderType: "voter",
      senderId: voter.voterId,
      senderName: voter.voterName,
      body: data.body,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    });

    s.lastVoterMessageAt = nowISO();
    s.updatedAt = nowISO();
    // If previously in timeout, reopen for any admin to claim
    if (s.status === "timeout") s.status = "open";
    sessions.set(s.id, s);

    io.to(`session_${voter.sessionId}`).emit("message:new", msg);
    notifyAdminsOfSessions();
  });

  // ─── Voter uploads photo ────────────────────────────────────
  socket.on("voter:photo", (data: { fileUrl: string; fileName: string }) => {
    const voter = voterSockets.get(socket.id);
    if (!voter) return;

    const msg = pushMessage(voter.sessionId, {
      senderType: "voter",
      senderId: voter.voterId,
      senderName: voter.voterName,
      body: "[Photo]",
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    });

    const s = sessions.get(voter.sessionId);
    if (s) {
      s.lastVoterMessageAt = nowISO();
      s.updatedAt = nowISO();
      if (s.status === "timeout") s.status = "open";
      sessions.set(s.id, s);
    }

    io.to(`session_${voter.sessionId}`).emit("message:new", msg);
    notifyAdminsOfSessions();
  });

  // ─── Admin connects ──────────────────────────────────────────
  socket.on("admin:join", (data: { adminId: string; adminName: string }) => {
    adminSockets.set(socket.id, { adminId: data.adminId, adminName: data.adminName });
    socket.join("admins");
    notifyAdminsOfSessions();
  });

  // ─── Admin claims a session ──────────────────────────────────
  socket.on("admin:claim", (data: { sessionId: string }) => {
    const admin = adminSockets.get(socket.id);
    if (!admin) return;

    const s = sessions.get(data.sessionId);
    if (!s) return;

    // Only claim if open or timed out
    if (s.status !== "open" && s.status !== "timeout") {
      socket.emit("claim:failed", { sessionId: data.sessionId, reason: "Session already claimed" });
      return;
    }

    // If previously assigned to another admin, notify them
    if (s.adminSocket && s.adminSocket !== socket.id) {
      io.to(s.adminSocket).emit("session:reassigned", { sessionId: data.sessionId });
    }

    s.adminSocket = socket.id;
    s.adminId = admin.adminId;
    s.adminName = admin.adminName;
    s.status = "assigned";
    s.updatedAt = nowISO();
    sessions.set(s.id, s);

    socket.join(`session_${data.sessionId}`);

    // Cancel any timeout timer
    const timer = sessionTimers.get(data.sessionId);
    if (timer) {
      clearTimeout(timer);
      sessionTimers.delete(data.sessionId);
    }

    socket.emit("claim:success", { sessionId: data.sessionId });
    socket.emit("messages:history", messages.get(data.sessionId) ?? []);

    io.to(`session_${data.sessionId}`).emit("admin:joined", {
      adminName: admin.adminName,
    });

    notifyAdminsOfSessions();
  });

  // ─── Admin sends message ─────────────────────────────────────
  socket.on("admin:message", (data: { sessionId: string; body: string; fileUrl?: string; fileName?: string }) => {
    const admin = adminSockets.get(socket.id);
    if (!admin) return;

    const s = sessions.get(data.sessionId);
    if (!s) return;

    // Only the assigned admin can send messages
    if (s.adminSocket !== socket.id) {
      socket.emit("message:rejected", { reason: "You are not assigned to this session" });
      return;
    }

    const msg = pushMessage(data.sessionId, {
      senderType: "admin",
      senderId: admin.adminId,
      senderName: admin.adminName,
      body: data.body,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
    });

    s.lastAdminMessageAt = nowISO();
    s.updatedAt = nowISO();
    sessions.set(s.id, s);

    io.to(`session_${data.sessionId}`).emit("message:new", msg);

    resetTimeoutTimer(data.sessionId);
    notifyAdminsOfSessions();
  });

  // ─── Admin requests photo from voter ────────────────────────
  socket.on("admin:request-photo", (data: { sessionId: string }) => {
    const s = sessions.get(data.sessionId);
    if (!s || s.adminSocket !== socket.id) return;
    io.to(`session_${data.sessionId}`).emit("photo:request", {
      message: "Please take a photo for verification.",
    });
  });

  // ─── Admin closes a session ─────────────────────────────────
  socket.on("admin:close", (data: { sessionId: string }) => {
    const s = sessions.get(data.sessionId);
    if (!s) return;
    s.status = "closed";
    s.updatedAt = nowISO();
    sessions.set(s.id, s);
    const timer = sessionTimers.get(data.sessionId);
    if (timer) {
      clearTimeout(timer);
      sessionTimers.delete(data.sessionId);
    }
    io.to(`session_${data.sessionId}`).emit("session:closed", { sessionId: data.sessionId });
    notifyAdminsOfSessions();
  });

  // ─── Admin fetches session history on demand ─────────────────
  socket.on("admin:history", (data: { sessionId: string }) => {
    socket.emit("messages:history", messages.get(data.sessionId) ?? []);
  });

  // ─── Disconnect ──────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (voterSockets.has(socket.id)) {
      const voter = voterSockets.get(socket.id)!;
      const s = sessions.get(voter.sessionId);
      if (s && s.voterSocket === socket.id) {
        // Mark session closed when voter disconnects (recorded for audit)
        s.status = "closed";
        s.updatedAt = nowISO();
        sessions.set(s.id, s);
      }
      voterSockets.delete(socket.id);
    }
    if (adminSockets.has(socket.id)) {
      adminSockets.delete(socket.id);
    }
    console.log(`[support-chat] disconnected: ${socket.id}`);
    notifyAdminsOfSessions();
  });
});

httpServer.listen(PORT, () => {
  console.log(`✓ Votewise support chat service listening on :${PORT}`);
});

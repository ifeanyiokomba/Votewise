import { createServer } from "http";
import { Server } from "socket.io";
import { Database } from "bun:sqlite";

const PORT = 3004;
const DB_PATH = "/home/z/my-project/db/custom.db";
const sqlite = new Database(DB_PATH, { readonly: false });
sqlite.exec("PRAGMA journal_mode = WAL;");

// ─── Tables for support chat ────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS SupportChatSession (
    id TEXT PRIMARY KEY,
    voterId TEXT NOT NULL,
    electionId TEXT,
    voterName TEXT,
    voterSocket TEXT,
    adminSocket TEXT,
    adminId TEXT,
    adminName TEXT,
    status TEXT DEFAULT 'open',
    -- 'open' = waiting for admin, 'assigned' = admin responding,
    -- 'timeout' = admin stopped responding 5min, 'closed' = voter left
    lastVoterMessageAt TEXT,
    lastAdminMessageAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS SupportChatMessage (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    senderType TEXT NOT NULL, -- 'voter' | 'admin' | 'system'
    senderId TEXT,
    senderName TEXT,
    body TEXT NOT NULL,
    fileUrl TEXT,
    fileName TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sessionId) REFERENCES SupportChatSession(id)
  );

  CREATE INDEX IF NOT EXISTS idx_chat_session_voter ON SupportChatSession(voterId);
  CREATE INDEX IF NOT EXISTS idx_chat_session_status ON SupportChatSession(status);
  CREATE INDEX IF NOT EXISTS idx_chat_msg_session ON SupportChatMessage(sessionId);
`);

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// In-memory state
const voterSockets = new Map(); // socketId -> { sessionId, voterId, voterName }
const adminSockets = new Map(); // socketId -> { adminId, adminName }
const sessionTimers = new Map(); // sessionId -> timeout

const FIVE_MINUTES = 5 * 60 * 1000;

io.on("connection", (socket) => {
  console.log(`[support-chat] connected: ${socket.id}`);

  // ─── Voter connects ─────────────────────────────────────────
  socket.on("voter:join", (data: { voterId: string; voterName: string; electionId?: string }) => {
    const sessionId = `chat_${data.voterId}_${Date.now()}`;
    
    // Create or reuse session
    const existing = sqlite
      .query("SELECT * FROM SupportChatSession WHERE voterId = ? AND status IN ('open', 'assigned')")
      .get(data.voterId) as any;

    let sid = sessionId;
    if (existing) {
      sid = existing.id;
      sqlite.query("UPDATE SupportChatSession SET voterSocket = ?, status = 'open' WHERE id = ?")
        .run(socket.id, sid);
    } else {
      sqlite.query(
        `INSERT INTO SupportChatSession (id, voterId, electionId, voterName, voterSocket, status)
         VALUES (?, ?, ?, ?, ?, 'open')`
      ).run(sid, data.voterId, data.electionId ?? null, data.voterName, socket.id);
    }

    voterSockets.set(socket.id, { sessionId: sid, voterId: data.voterId, voterName: data.voterName });
    socket.join(`session_${sid}`);
    socket.emit("session:created", { sessionId: sid });

    // Load message history
    const messages = sqlite
      .query("SELECT * FROM SupportChatMessage WHERE sessionId = ? ORDER BY createdAt ASC")
      .all(sid);
    socket.emit("messages:history", messages);

    // Notify all admins about new/updated session
    notifyAdminsOfSessions();
  });

  // ─── Voter sends message ────────────────────────────────────
  socket.on("voter:message", (data: { body: string; fileUrl?: string; fileName?: string }) => {
    const voter = voterSockets.get(socket.id);
    if (!voter) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sqlite.query(
      `INSERT INTO SupportChatMessage (id, sessionId, senderType, senderId, senderName, body, fileUrl, fileName)
       VALUES (?, ?, 'voter', ?, ?, ?, ?, ?)`
    ).run(msgId, voter.sessionId, voter.voterId, voter.voterName, data.body, data.fileUrl ?? null, data.fileName ?? null);

    sqlite.query("UPDATE SupportChatSession SET lastVoterMessageAt = ?, updatedAt = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), voter.sessionId);

    // If session was in 'timeout', reopen it
    sqlite.query("UPDATE SupportChatSession SET status = 'open' WHERE id = ? AND status = 'timeout'")
      .run(voter.sessionId);

    // Broadcast to the session room (voter + assigned admin)
    io.to(`session_${voter.sessionId}`).emit("message:new", {
      id: msgId,
      sessionId: voter.sessionId,
      senderType: "voter",
      senderName: voter.voterName,
      body: data.body,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      createdAt: new Date().toISOString(),
    });

    // Notify all admins about updated sessions
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

    const session = sqlite.query("SELECT * FROM SupportChatSession WHERE id = ?").get(data.sessionId) as any;
    if (!session) return;

    // Only claim if open or timed out
    if (session.status !== "open" && session.status !== "timeout") {
      socket.emit("claim:failed", { sessionId: data.sessionId, reason: "Session already claimed" });
      return;
    }

    // If previously assigned to another admin, clear that
    if (session.adminSocket && session.adminSocket !== socket.id) {
      io.to(session.adminSocket).emit("session:reassigned", { sessionId: data.sessionId });
    }

    sqlite.query(
      "UPDATE SupportChatSession SET adminSocket = ?, adminId = ?, adminName = ?, status = 'assigned', updatedAt = ? WHERE id = ?"
    ).run(socket.id, admin.adminId, admin.adminName, new Date().toISOString(), data.sessionId);

    socket.join(`session_${data.sessionId}`);

    // Cancel any timeout timer
    const timer = sessionTimers.get(data.sessionId);
    if (timer) { clearTimeout(timer); sessionTimers.delete(data.sessionId); }

    socket.emit("claim:success", { sessionId: data.sessionId });
    
    // Load message history for admin
    const messages = sqlite
      .query("SELECT * FROM SupportChatMessage WHERE sessionId = ? ORDER BY createdAt ASC")
      .all(data.sessionId);
    socket.emit("messages:history", messages);

    // Notify voter that an admin joined
    io.to(`session_${data.sessionId}`).emit("admin:joined", {
      adminName: admin.adminName,
    });

    notifyAdminsOfSessions();
  });

  // ─── Admin sends message ─────────────────────────────────────
  socket.on("admin:message", (data: { sessionId: string; body: string; fileUrl?: string; fileName?: string }) => {
    const admin = adminSockets.get(socket.id);
    if (!admin) return;

    const session = sqlite.query("SELECT * FROM SupportChatSession WHERE id = ?").get(data.sessionId) as any;
    if (!session) return;

    // Only the assigned admin can send messages
    if (session.adminSocket !== socket.id) {
      socket.emit("message:rejected", { reason: "You are not assigned to this session" });
      return;
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sqlite.query(
      `INSERT INTO SupportChatMessage (id, sessionId, senderType, senderId, senderName, body, fileUrl, fileName)
       VALUES (?, ?, 'admin', ?, ?, ?, ?, ?)`
    ).run(msgId, data.sessionId, admin.adminId, admin.adminName, data.body, data.fileUrl ?? null, data.fileName ?? null);

    sqlite.query("UPDATE SupportChatSession SET lastAdminMessageAt = ?, updatedAt = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), data.sessionId);

    // Broadcast to the session room
    io.to(`session_${data.sessionId}`).emit("message:new", {
      id: msgId,
      sessionId: data.sessionId,
      senderType: "admin",
      senderName: admin.adminName,
      body: data.body,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      createdAt: new Date().toISOString(),
    });

    // Reset the 5-minute timeout timer
    resetTimeoutTimer(data.sessionId);

    notifyAdminsOfSessions();
  });

  // ─── Admin requests photo from voter ─────────────────────────
  socket.on("admin:request-photo", (data: { sessionId: string }) => {
    io.to(`session_${data.sessionId}`).emit("photo:request", {
      message: "Please take a photo for verification.",
    });
  });

  // ─── Voter sends photo ───────────────────────────────────────
  socket.on("voter:photo", (data: { fileUrl: string; fileName: string }) => {
    const voter = voterSockets.get(socket.id);
    if (!voter) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sqlite.query(
      `INSERT INTO SupportChatMessage (id, sessionId, senderType, senderId, senderName, body, fileUrl, fileName)
       VALUES (?, ?, 'voter', ?, ?, '[Photo]', ?, ?)`
    ).run(msgId, voter.sessionId, voter.voterId, voter.voterName, data.fileUrl, data.fileName);

    io.to(`session_${voter.sessionId}`).emit("message:new", {
      id: msgId,
      sessionId: voter.sessionId,
      senderType: "voter",
      senderName: voter.voterName,
      body: "[Photo]",
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      createdAt: new Date().toISOString(),
    });

    notifyAdminsOfSessions();
  });

  // ─── Disconnect ──────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (voterSockets.has(socket.id)) {
      const voter = voterSockets.get(socket.id);
      sqlite.query("UPDATE SupportChatSession SET status = 'closed', updatedAt = ? WHERE id = ? AND voterSocket = ?")
        .run(new Date().toISOString(), voter.sessionId, socket.id);
      voterSockets.delete(socket.id);
    }
    if (adminSockets.has(socket.id)) {
      adminSockets.delete(socket.id);
    }
    console.log(`[support-chat] disconnected: ${socket.id}`);
    notifyAdminsOfSessions();
  });
});

// ─── Helper: 5-minute timeout ────────────────────────────────────
function resetTimeoutTimer(sessionId: string) {
  const existing = sessionTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    // Admin hasn't responded in 5 minutes — open session for other admins
    sqlite.query("UPDATE SupportChatSession SET status = 'timeout', adminSocket = NULL, adminId = NULL, adminName = NULL WHERE id = ? AND status = 'assigned'")
      .run(sessionId);
    
    // Notify voter that admin left
    io.to(`session_${sessionId}`).emit("admin:left", {
      message: "Your support agent is no longer available. Another agent will assist you shortly.",
    });

    sessionTimers.delete(sessionId);
    notifyAdminsOfSessions();
    console.log(`[support-chat] Session ${sessionId} timed out — reopened for other admins`);
  }, FIVE_MINUTES);

  sessionTimers.set(sessionId, timer);
}

// ─── Helper: notify admins of session list ────────────────────────
function notifyAdminsOfSessions() {
  const sessions = sqlite
    .query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM SupportChatMessage m WHERE m.sessionId = s.id) as messageCount,
        (SELECT body FROM SupportChatMessage m WHERE m.sessionId = s.id AND m.senderType = 'voter' ORDER BY createdAt DESC LIMIT 1) as lastMessage
      FROM SupportChatSession s
      WHERE s.status IN ('open', 'assigned', 'timeout')
      ORDER BY s.updatedAt DESC
      LIMIT 50
    `)
    .all();

  io.to("admins").emit("sessions:update", sessions);
}

httpServer.listen(PORT, () => {
  console.log(`✓ Votewise support chat service listening on :${PORT}`);
});

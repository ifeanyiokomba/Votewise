import { Database } from "bun:sqlite";

/**
 * Votewise Election Scheduler
 *
 * Periodically scans the database and performs automatic election status
 * transitions based on start/end times:
 *   - SCHEDULED → LIVE   (when startTime has passed)
 *   - LIVE → CLOSED      (when endTime has passed)
 *   - SCHEDULED → CLOSED (if endTime passed without going live)
 *
 * Runs every 60 seconds. Uses SQLite directly (read/write) against the
 * shared Prisma database.
 */

const DB_PATH = "/home/z/my-project/db/custom.db";
const POLL_INTERVAL_MS = 60_000;

const sqlite = new Database(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL;");

interface ScheduledElection {
  id: string;
  name: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  organizationId: string;
}

function pollAndTransition() {
  const now = new Date();
  const nowIso = now.toISOString();

  // SCHEDULED → LIVE (startTime has passed, endTime not yet)
  const dueToStart = sqlite
    .query(
      `SELECT id, name, status, startTime, endTime, organizationId
       FROM Election
       WHERE status = 'SCHEDULED'
         AND startTime IS NOT NULL
         AND startTime <= ?
         AND (endTime IS NULL OR endTime > ?)`
    )
    .all(nowIso, nowIso) as ScheduledElection[];

  for (const el of dueToStart) {
    try {
      sqlite
        .query(`UPDATE Election SET status = 'LIVE', updatedAt = ? WHERE id = ?`)
        .run(nowIso, el.id);
      logTransition(el, "SCHEDULED", "LIVE");
    } catch (e) {
      console.error(`[scheduler] failed to start election ${el.id}:`, e);
    }
  }

  // LIVE → CLOSED (endTime has passed)
  const dueToEnd = sqlite
    .query(
      `SELECT id, name, status, startTime, endTime, organizationId
       FROM Election
       WHERE status = 'LIVE'
         AND endTime IS NOT NULL
         AND endTime <= ?`
    )
    .all(nowIso) as ScheduledElection[];

  for (const el of dueToEnd) {
    try {
      sqlite
        .query(`UPDATE Election SET status = 'CLOSED', updatedAt = ? WHERE id = ?`)
        .run(nowIso, el.id);
      logTransition(el, "LIVE", "CLOSED");
    } catch (e) {
      console.error(`[scheduler] failed to close election ${el.id}:`, e);
    }
  }

  // SCHEDULED → CLOSED (endTime passed without going live — edge case)
  const missedElections = sqlite
    .query(
      `SELECT id, name, status, startTime, endTime, organizationId
       FROM Election
       WHERE status = 'SCHEDULED'
         AND endTime IS NOT NULL
         AND endTime <= ?`
    )
    .all(nowIso) as ScheduledElection[];

  for (const el of missedElections) {
    try {
      sqlite
        .query(`UPDATE Election SET status = 'CLOSED', updatedAt = ? WHERE id = ?`)
        .run(nowIso, el.id);
      logTransition(el, "SCHEDULED", "CLOSED (missed window)");
    } catch (e) {
      console.error(`[scheduler] failed to close missed election ${el.id}:`, e);
    }
  }

  const totalTransitions = dueToStart.length + dueToEnd.length + missedElections.length;
  if (totalTransitions > 0) {
    console.log(
      `[scheduler] ${nowIso} — ${totalTransitions} transition(s): ` +
        `${dueToStart.length} started, ${dueToEnd.length} closed, ${missedElections.length} missed-window.`
    );
  }
}

function logTransition(el: ScheduledElection, from: string, to: string) {
  // Insert an audit log entry for the automatic transition
  const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const nowIso = new Date().toISOString();
  try {
    sqlite
      .query(
        `INSERT INTO AuditLog (id, actorId, organizationId, action, resource, resourceId, result, metadata, correlationId, ipAddress, userAgent, timestamp)
         VALUES (?, NULL, ?, 'ELECTION_ACTIVATE', 'election', ?, 'SUCCESS', ?, ?, NULL, 'votewise-scheduler', ?)`
      )
      .run(
        id,
        el.organizationId,
        el.id,
        JSON.stringify({ automated: true, from, to }),
        `scheduler-${id}`,
        nowIso
      );
  } catch (e) {
    console.error(`[scheduler] failed to log transition for ${el.id}:`, e);
  }
}

console.log(`✓ Votewise scheduler service started — polling every ${POLL_INTERVAL_MS / 1000}s`);

// Run once immediately, then on interval
pollAndTransition();
setInterval(pollAndTransition, POLL_INTERVAL_MS);

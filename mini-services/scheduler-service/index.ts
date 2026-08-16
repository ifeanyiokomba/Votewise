import { PrismaClient } from "../../node_modules/@prisma/client";

/**
 * Votewise Election Scheduler
 *
 * Periodically scans the database and performs automatic election status
 * transitions based on start/end times:
 *   - SCHEDULED → LIVE   (when startTime has passed)
 *   - LIVE → CLOSED      (when endTime has passed)
 *   - SCHEDULED → CLOSED (if endTime passed without going live)
 *
 * Runs every 60 seconds. Uses Prisma against the same DATABASE_URL as the
 * main Next.js app — no separate SQLite file.
 */

const POLL_INTERVAL_MS = 60_000;

const db = new PrismaClient();

async function pollAndTransition() {
  const now = new Date();

  // SCHEDULED → LIVE (startTime has passed, endTime not yet)
  const dueToStart = await db.election.findMany({
    where: {
      status: "SCHEDULED",
      startTime: { lte: now },
      OR: [{ endTime: null }, { endTime: { gt: now } }],
    },
    select: { id: true, name: true, organizationId: true },
  });

  for (const el of dueToStart) {
    try {
      await db.election.update({
        where: { id: el.id },
        data: { status: "LIVE" },
      });
      await logTransition(el, "SCHEDULED", "LIVE");
    } catch (e) {
      console.error(`[scheduler] failed to start election ${el.id}:`, e);
    }
  }

  // LIVE → CLOSED (endTime has passed)
  const dueToEnd = await db.election.findMany({
    where: {
      status: "LIVE",
      endTime: { lte: now },
    },
    select: { id: true, name: true, organizationId: true },
  });

  for (const el of dueToEnd) {
    try {
      await db.election.update({
        where: { id: el.id },
        data: { status: "CLOSED" },
      });
      await logTransition(el, "LIVE", "CLOSED");
    } catch (e) {
      console.error(`[scheduler] failed to close election ${el.id}:`, e);
    }
  }

  // SCHEDULED → CLOSED (endTime passed without going live — edge case)
  const missedElections = await db.election.findMany({
    where: {
      status: "SCHEDULED",
      endTime: { lte: now },
    },
    select: { id: true, name: true, organizationId: true },
  });

  for (const el of missedElections) {
    try {
      await db.election.update({
        where: { id: el.id },
        data: { status: "CLOSED" },
      });
      await logTransition(el, "SCHEDULED", "CLOSED (missed window)");
    } catch (e) {
      console.error(`[scheduler] failed to close missed election ${el.id}:`, e);
    }
  }

  // ─── Auto-revert custom domains after election closes ───────────────
  // When an election closes AND the org has an approved custom domain,
  // check if the org has any remaining LIVE elections. If none, revert
  // the custom domain back to the default subdomain — all data stays intact.
  const closedOrgIds = new Set<string>([
    ...dueToEnd.map((e) => e.organizationId),
    ...missedElections.map((e) => e.organizationId),
  ]);

  for (const orgId of closedOrgIds) {
    try {
      const org = await db.organization.findFirst({
        where: { id: orgId, domain: { not: null }, domainStatus: "approved" },
        select: { id: true, name: true, slug: true, domain: true },
      });
      if (!org) continue;

      const liveCount = await db.election.count({
        where: { organizationId: orgId, status: "LIVE" },
      });

      if (liveCount === 0) {
        await db.organization.update({
          where: { id: org.id },
          data: { domain: null, domainStatus: null, domainRequestedAt: null, domainApprovedAt: null },
        });
        console.log(
          `[scheduler] Auto-reverted custom domain for ${org.name} (${org.domain}) → ${org.slug}.votewise.com.ng. All data intact.`
        );
      }
    } catch (e) {
      console.error(`[scheduler] failed to check domain revert for org ${orgId}:`, e);
    }
  }

  const totalTransitions = dueToStart.length + dueToEnd.length + missedElections.length;
  if (totalTransitions > 0) {
    console.log(
      `[scheduler] ${now.toISOString()} — ${totalTransitions} transition(s): ` +
        `${dueToStart.length} started, ${dueToEnd.length} closed, ${missedElections.length} missed-window.`
    );
  }
}

async function logTransition(
  el: { id: string; name: string; organizationId: string },
  from: string,
  to: string
) {
  try {
    await db.auditLog.create({
      data: {
        organizationId: el.organizationId,
        action: "ELECTION_ACTIVATE",
        resource: "election",
        resourceId: el.id,
        result: "SUCCESS",
        metadata: JSON.stringify({ automated: true, from, to }),
        correlationId: `scheduler-${Date.now()}`,
        userAgent: "votewise-scheduler",
        timestamp: new Date(),
      },
    });
  } catch (e) {
    console.error(`[scheduler] failed to log transition for ${el.id}:`, e);
  }
}

async function main() {
  console.log(
    `✓ Votewise scheduler service started — polling every ${POLL_INTERVAL_MS / 1000}s`
  );
  await pollAndTransition();
  setInterval(() => {
    pollAndTransition().catch((e) =>
      console.error("[scheduler] poll error:", e)
    );
  }, POLL_INTERVAL_MS);
}

main().catch((e) => {
  console.error("[scheduler] fatal error:", e);
  process.exit(1);
});

import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";

/**
 * Internal scheduler endpoint (VW-005).
 *
 * SECURITY: This endpoint is only callable by the scheduler service,
 * authenticated via the X-Scheduler-Auth header matching SCHEDULER_AUTH_TOKEN.
 *
 * The scheduler no longer connects to the database directly — it calls
 * this endpoint, which performs the transitions through the main app's
 * Prisma client and logs them to the audit trail.
 *
 * This endpoint is NOT in the public routes list — it requires the
 * X-Scheduler-Auth header. The proxy middleware will still apply, but
 * since this is an /api/ route, it won't redirect.
 */

const EXPECTED_TOKEN = process.env.SCHEDULER_AUTH_TOKEN;

export async function POST(request: Request) {
  try {
    // Verify the shared secret
    if (!EXPECTED_TOKEN) {
      console.error("[scheduler-api] SCHEDULER_AUTH_TOKEN not set on server");
      return ok({ error: "Server not configured" }, 500);
    }

    const authHeader = request.headers.get("x-scheduler-auth");
    if (authHeader !== EXPECTED_TOKEN) {
      console.warn("[scheduler-api] Unauthorized scheduler request");
      return ok({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    let started = 0;
    let closed = 0;
    let missed = 0;

    // SCHEDULED → LIVE
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
        started++;
      } catch (e) {
        console.error(`[scheduler-api] failed to start election ${el.id}:`, e);
      }
    }

    // LIVE → CLOSED
    const dueToEnd = await db.election.findMany({
      where: { status: "LIVE", endTime: { lte: now } },
      select: { id: true, name: true, organizationId: true },
    });

    for (const el of dueToEnd) {
      try {
        await db.election.update({
          where: { id: el.id },
          data: { status: "CLOSED" },
        });
        await logTransition(el, "LIVE", "CLOSED");
        closed++;
      } catch (e) {
        console.error(`[scheduler-api] failed to close election ${el.id}:`, e);
      }
    }

    // SCHEDULED → CLOSED (missed window)
    const missedElections = await db.election.findMany({
      where: { status: "SCHEDULED", endTime: { lte: now } },
      select: { id: true, name: true, organizationId: true },
    });

    for (const el of missedElections) {
      try {
        await db.election.update({
          where: { id: el.id },
          data: { status: "CLOSED" },
        });
        await logTransition(el, "SCHEDULED", "CLOSED (missed window)");
        missed++;
      } catch (e) {
        console.error(`[scheduler-api] failed to close missed election ${el.id}:`, e);
      }
    }

    // Auto-revert custom domains
    const closedOrgIds = new Set([
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
          console.log(`[scheduler-api] Reverted custom domain for ${org.name}`);
        }
      } catch (e) {
        console.error(`[scheduler-api] domain revert failed for ${orgId}:`, e);
      }
    }

    return ok({
      transitions: started + closed + missed,
      started,
      closed,
      missed,
    });
  } catch (e) {
    return handleError(e);
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
    console.error(`[scheduler-api] audit log failed for ${el.id}:`, e);
  }
}

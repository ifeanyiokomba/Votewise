import { ok, handleError } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Platform-wide statistics for Platform Admin dashboard.
 * Returns aggregate metrics across all organizations.
 */
export async function GET() {
  try {
    await requireRole("PLATFORM_ADMIN");

    const [
      organizations,
      elections,
      activeElections,
      voters,
      candidates,
      totalVotes,
      pendingNegotiations,
      pendingPayments,
      openTickets,
      securityEvents,
      completedPayments,
    ] = await Promise.all([
      db.organization.count(),
      db.election.count(),
      db.election.count({ where: { status: "LIVE" } }),
      db.voter.count(),
      db.candidate.count(),
      db.vote.count({ where: { status: "CAST" } }),
      db.negotiationRequest.count({
        where: { status: { in: ["REQUESTED", "UNDER_REVIEW", "IN_PROGRESS"] } },
      }),
      db.electionPayment.count({ where: { status: "PENDING" } }),
      db.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      }),
      db.securityEvent.count({ where: { resolved: false } }),
      db.electionPayment.count({ where: { status: "COMPLETED" } }),
    ]);

    // Recent organizations
    const recentOrgs = await db.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionTier: true,
        createdAt: true,
        _count: { select: { elections: true, voters: true } },
      },
    });

    // Recent elections across all orgs
    const recentElections = await db.election.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        createdAt: true,
        organization: { select: { name: true } },
        _count: { select: { voters: true, votes: true } },
      },
    });

    // Recent payments
    const recentPayments = await db.electionPayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        activation: {
          select: {
            election: { select: { name: true, organization: { select: { name: true } } } },
          },
        },
      },
    });

    return ok({
      stats: {
        organizations,
        elections,
        activeElections,
        voters,
        candidates,
        totalVotes,
        pendingNegotiations,
        pendingPayments,
        openTickets,
        securityEvents,
        completedPayments,
      },
      recentOrgs,
      recentElections,
      recentPayments,
    });
  } catch (e) {
    return handleError(e);
  }
}

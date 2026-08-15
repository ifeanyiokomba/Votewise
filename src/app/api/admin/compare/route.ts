import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await requireOrgMember();
    const url = new URL(request.url);
    const range = url.searchParams.get("range") ?? "all";

    // Compute date filter based on range
    let dateFilter: Date | null = null;
    const now = new Date();
    if (range === "week") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "month") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "quarter") {
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const elections = await db.election.findMany({
      where: {
        organizationId: user.organizationId,
        ...(dateFilter
          ? { OR: [{ startTime: { gte: dateFilter } }, { createdAt: { gte: dateFilter } }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        _count: {
          select: { voters: true, votes: true, positions: true, candidates: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const comparison = elections.map((e) => {
      const voters = e._count.voters;
      const votes = e._count.votes;
      const turnout = voters > 0 ? (votes / voters) * 100 : 0;
      return {
        id: e.id,
        name: e.name,
        status: e.status,
        type: e.type,
        startTime: e.startTime,
        endTime: e.endTime,
        createdAt: e.createdAt,
        voters,
        votes,
        positions: e._count.positions,
        candidates: e._count.candidates,
        turnout: Math.round(turnout * 10) / 10,
      };
    });

    // Aggregate trend data (elections over time)
    const trend = comparison
      .filter((e) => e.voters > 0)
      .map((e) => ({
        name: e.name,
        turnout: e.turnout,
        voters: e.voters,
        votes: e.votes,
        date: e.startTime ?? e.createdAt,
      }));

    // Type distribution
    const typeDistribution = comparison.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Status distribution
    const statusDistribution = comparison.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return ok({
      elections: comparison,
      trend,
      typeDistribution,
      statusDistribution,
      totals: {
        elections: comparison.length,
        totalVoters: comparison.reduce((s, e) => s + e.voters, 0),
        totalVotes: comparison.reduce((s, e) => s + e.votes, 0),
        avgTurnout:
          trend.length > 0
            ? Math.round((trend.reduce((s, e) => s + e.turnout, 0) / trend.length) * 10) / 10
            : 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

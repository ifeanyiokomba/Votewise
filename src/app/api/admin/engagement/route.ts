import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireOrgMember();

    const elections = await db.election.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        startTime: true,
        endTime: true,
        _count: { select: { voters: true, votes: true, positions: true, candidates: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute engagement metrics per election
    const leaderboard = elections
      .map((e) => {
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
          voters,
          votes,
          positions: e._count.positions,
          candidates: e._count.candidates,
          turnout: Math.round(turnout * 10) / 10,
        };
      })
      .filter((e) => e.voters > 0) // Only include elections with voters
      .sort((a, b) => b.turnout - a.turnout);

    // Aggregate org-wide metrics
    const totalVoters = elections.reduce((sum, e) => sum + e._count.voters, 0);
    const totalVotes = elections.reduce((sum, e) => sum + e._count.votes, 0);
    const avgTurnout =
      leaderboard.length > 0
        ? Math.round(
            (leaderboard.reduce((sum, e) => sum + e.turnout, 0) / leaderboard.length) * 10
          ) / 10
        : 0;

    // Best performing election
    const bestElection = leaderboard[0] ?? null;

    // Most recent active election
    const activeElections = elections.filter((e) =>
      ["LIVE", "SCHEDULED", "READY"].includes(e.status)
    );

    return ok({
      leaderboard,
      summary: {
        totalVoters,
        totalVotes,
        avgTurnout,
        electionsWithVoters: leaderboard.length,
        activeCount: activeElections.length,
        bestElection,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

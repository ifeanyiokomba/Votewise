import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";

/**
 * Live election dashboard data — returns active elections with:
 * - Real-time turnout stats
 * - Candidate list with headshots and live vote counts
 * - Position breakdown
 */
export async function GET() {
  try {
    const user = await requireOrgMember();

    const elections = await db.election.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["LIVE", "SCHEDULED", "READY", "PAUSED"] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        type: true,
        startTime: true,
        endTime: true,
        config: true,
        _count: {
          select: { voters: true, votes: true, positions: true, candidates: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const liveElections = await Promise.all(
      elections.map(async (e) => {
        const config = safeJsonParse<Record<string, unknown>>(e.config, {});
        const resultVisibility = (config.resultVisibility as string) ?? "PUBLISHED_ONLY";

        const [voters, verified, votes, activeSessions] = await Promise.all([
          db.voter.count({ where: { electionId: e.id } }),
          db.verificationAttempt.count({ where: { electionId: e.id, status: "VERIFIED" } }),
          db.vote.count({ where: { electionId: e.id, status: "CAST" } }),
          db.votingSession.count({ where: { electionId: e.id, isActive: true } }),
        ]);

        const positions = await db.position.findMany({
          where: { electionId: e.id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            maxChoices: true,
            candidates: {
              select: { id: true, name: true, photo: true, bio: true, manifesto: true },
            },
          },
        });

        const voteCounts = await db.vote.groupBy({
          by: ["candidateId"],
          where: { electionId: e.id, status: "CAST" },
          _count: { _all: true },
        });
        const voteMap = new Map<string, number>();
        for (const v of voteCounts) voteMap.set(v.candidateId, v._count._all);

        const positionsWithVotes = positions.map((p) => ({
          ...p,
          candidates: p.candidates
            .map((c) => ({ ...c, voteCount: voteMap.get(c.id) ?? 0 }))
            .sort((a, b) => b.voteCount - a.voteCount),
        }));

        const turnout = voters > 0 ? (votes / voters) * 100 : 0;

        return {
          id: e.id,
          name: e.name,
          description: e.description,
          status: e.status,
          type: e.type,
          startTime: e.startTime,
          endTime: e.endTime,
          resultVisibility,
          stats: {
            voters, verified, votes, activeSessions,
            positions: e._count.positions,
            candidates: e._count.candidates,
            turnout: Math.round(turnout * 10) / 10,
            verificationRate: voters > 0 ? Math.round((verified / voters) * 1000) / 10 : 0,
          },
          positions: positionsWithVotes,
        };
      })
    );

    return ok({ elections: liveElections });
  } catch (e) {
    return handleError(e);
  }
}

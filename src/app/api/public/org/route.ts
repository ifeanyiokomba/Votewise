import { ok, handleError, fail } from "@/lib/api-response";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";

/**
 * Public organization profile — fetches org by slug or custom domain.
 * Returns branding, logo, name, description, and election info.
 * For LIVE elections with resultVisibility=LIVE: includes real-time vote counts per candidate.
 * For PUBLISHED elections: includes final results with percentages.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const domain = searchParams.get("domain");

    let org;
    if (slug) {
      org = await db.organization.findUnique({
        where: { slug },
        select: {
          id: true, name: true, slug: true, logo: true, description: true,
          domain: true, contactInfo: true, branding: true,
        },
      });
    } else if (domain) {
      org = await db.organization.findFirst({
        where: { domain },
        select: {
          id: true, name: true, slug: true, logo: true, description: true,
          domain: true, contactInfo: true, branding: true,
        },
      });
    }

    if (!org) return fail("Organization not found", "NOT_FOUND", 404);

    // Fetch LIVE elections with candidates + real-time vote counts
    const liveElections = await db.election.findMany({
      where: { organizationId: org.id, status: "LIVE" },
      select: {
        id: true, name: true, description: true, startTime: true, endTime: true,
        type: true, config: true,
        _count: { select: { voters: true, votes: true } },
        positions: {
          select: {
            id: true, title: true, order: true,
            candidates: {
              select: { id: true, name: true, photo: true, bio: true, manifesto: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // Fetch PUBLISHED elections with final results
    const publishedElections = await db.election.findMany({
      where: { organizationId: org.id, status: "PUBLISHED" },
      select: {
        id: true, name: true, description: true, startTime: true, endTime: true, type: true,
        _count: { select: { voters: true, votes: true } },
        positions: {
          select: {
            id: true, title: true, order: true,
            candidates: {
              select: { id: true, name: true, photo: true, bio: true, manifesto: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // For LIVE elections: add real-time vote counts per candidate (if resultVisibility=LIVE)
    const liveWithResults = await Promise.all(
      liveElections.map(async (e) => {
        const config = safeJsonParse<Record<string, unknown>>(e.config, {});
        const resultVisibility = (config.resultVisibility as string) ?? "PUBLISHED_ONLY";
        const showLiveResults = resultVisibility === "LIVE";

        let positionsWithVotes = e.positions;
        let totalVotes = e._count.votes;
        let totalVoters = e._count.voters;

        if (showLiveResults) {
          // Get vote counts per candidate
          const voteCounts = await db.vote.groupBy({
            by: ["candidateId"],
            where: { electionId: e.id, status: "CAST" },
            _count: { _all: true },
          });
          const voteMap = new Map<string, number>();
          for (const v of voteCounts) voteMap.set(v.candidateId, v._count._all);

          positionsWithVotes = e.positions.map((p) => ({
            ...p,
            candidates: p.candidates
              .map((c) => ({ ...c, voteCount: voteMap.get(c.id) ?? 0 }))
              .sort((a, b) => (b as any).voteCount - (a as any).voteCount),
          }));

          // Calculate percentages
          const positionTotals = await Promise.all(
            positionsWithVotes.map(async (pos) => {
              const posTotal = await db.vote.count({
                where: { electionId: e.id, positionId: pos.id, status: "CAST" },
              });
              return {
                ...pos,
                totalVotes: posTotal,
                candidates: pos.candidates.map((c: any) => ({
                  ...c,
                  percentage: posTotal > 0 ? Math.round((c.voteCount / posTotal) * 1000) / 10 : 0,
                })),
              };
            })
          );
          positionsWithVotes = positionTotals as any;
        }

        return {
          ...e,
          resultVisibility,
          showLiveResults,
          stats: {
            voters: totalVoters,
            votes: totalVotes,
            turnout: totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 1000) / 10 : 0,
          },
          positions: positionsWithVotes,
        };
      })
    );

    // For PUBLISHED elections: add final results with percentages
    const publishedWithResults = await Promise.all(
      publishedElections.map(async (e) => {
        const voteCounts = await db.vote.groupBy({
          by: ["candidateId"],
          where: { electionId: e.id, status: "CAST" },
          _count: { _all: true },
        });
        const voteMap = new Map<string, number>();
        for (const v of voteCounts) voteMap.set(v.candidateId, v._count._all);

        const positionsWithResults = await Promise.all(
          e.positions.map(async (pos) => {
            const posTotal = await db.vote.count({
              where: { electionId: e.id, positionId: pos.id, status: "CAST" },
            });
            return {
              ...pos,
              totalVotes: posTotal,
              candidates: pos.candidates
                .map((c) => ({
                  ...c,
                  voteCount: voteMap.get(c.id) ?? 0,
                  percentage: posTotal > 0 ? Math.round((voteMap.get(c.id) ?? 0) / posTotal * 1000) / 10 : 0,
                }))
                .sort((a: any, b: any) => b.voteCount - a.voteCount),
            };
          })
        );

        return {
          ...e,
          stats: {
            voters: e._count.voters,
            votes: e._count.votes,
            turnout: e._count.voters > 0 ? Math.round((e._count.votes / e._count.voters) * 1000) / 10 : 0,
          },
          positions: positionsWithResults,
        };
      })
    );

    // Fetch upcoming elections
    const upcomingElections = await db.election.findMany({
      where: { organizationId: org.id, status: { in: ["SCHEDULED", "READY"] } },
      select: { id: true, name: true, description: true, startTime: true, endTime: true, type: true },
      orderBy: { startTime: "asc" },
    });

    return ok({
      organization: org,
      liveElections: liveWithResults,
      publishedElections: publishedWithResults,
      upcomingElections,
    });
  } catch (e) {
    return handleError(e);
  }
}

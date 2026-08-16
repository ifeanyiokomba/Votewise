import { ok, handleError, fail } from "@/lib/api-response";
import { db } from "@/lib/db";
import { ResultService } from "@/services/result.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Public observer view — read-only election health metrics.
 * Returns turnout, verification rates, and (if published) results.
 * Never exposes voter identities or individual ballot choices.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const election = await db.election.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startTime: true,
        endTime: true,
        timezone: true,
        type: true,
        organization: {
          select: { name: true, slug: true, logo: true },
        },
      },
    });

    if (!election) return fail("Election not found", "NOT_FOUND", 404);

    // Compute aggregate stats (no voter-identifying data)
    const [voters, verified, completedVotes, activeSessions, candidates, positions] =
      await Promise.all([
        db.voter.count({ where: { electionId: id } }),
        db.verificationAttempt.count({
          where: { electionId: id, status: "VERIFIED" },
        }),
        db.vote.count({ where: { electionId: id, status: "CAST" } }),
        db.votingSession.count({
          where: { electionId: id, isActive: true },
        }),
        db.candidate.count({ where: { electionId: id } }),
        db.position.count({ where: { electionId: id } }),
      ]);

    const turnout = voters > 0 ? (completedVotes / voters) * 100 : 0;
    const verificationRate = voters > 0 ? (verified / voters) * 100 : 0;

    // Vote timeline (anonymous, per-hour buckets)
    const timelineRows = await db.vote.findMany({
      where: { electionId: id, status: "CAST" },
      select: { castAt: true },
      orderBy: { castAt: "asc" },
    });
    const buckets = new Map<string, number>();
    for (const v of timelineRows) {
      const key = new Date(v.castAt).toISOString().slice(0, 13);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const timeline = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }));
    const cumulative: { hour: string; count: number; total: number }[] = [];
    let running = 0;
    for (const t of timeline) {
      running += t.count;
      cumulative.push({ ...t, total: running });
    }

    // Position-level results (only if PUBLISHED)
    let results = null;
    if (election.status === "PUBLISHED") {
      results = await ResultService.computeElectionResults(id);
    }

    return ok({
      election,
      stats: {
        voters,
        verified,
        completedVotes,
        activeSessions,
        candidates,
        positions,
        turnout,
        verificationRate,
      },
      timeline: cumulative,
      results,
    });
  } catch (e) {
    return handleError(e);
  }
}

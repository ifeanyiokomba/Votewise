import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Voter engagement scoring API.
 *
 * Scores voters based on their participation across elections:
 *   - Verified (OTP confirmed): +30 points
 *   - Voted (ballot cast): +50 points
 *   - Speed bonus (voted within 30 min of verification): +20 points
 *
 * Also returns aggregate org engagement metrics.
 */
export async function GET() {
  try {
    const user = await requireOrgMember();

    // Fetch all voters in the org with their election context
    const voters = await db.voter.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        uniqueIdentifier: true,
        isEligible: true,
        electionId: true,
        election: {
          select: { id: true, name: true, status: true },
        },
        verificationAttempts: {
          where: { status: "VERIFIED" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        votingSessions: {
          where: { isActive: false, completedAt: { not: null } },
          select: { id: true, startedAt: true, completedAt: true },
          orderBy: { completedAt: "asc" },
          take: 1,
        },
      },
    });

    // Compute scores per voter
    const scored = voters.map((v) => {
      let score = 0;
      const breakdown: string[] = [];

      const verified = v.verificationAttempts[0];
      const voted = v.votingSessions[0];

      if (verified) {
        score += 30;
        breakdown.push("Verified (+30)");
      }
      if (voted) {
        score += 50;
        breakdown.push("Voted (+50)");
        // Speed bonus: voted within 30 minutes of verification
        if (verified && voted.completedAt && verified.createdAt) {
          const diffMs =
            new Date(voted.completedAt).getTime() -
            new Date(verified.createdAt).getTime();
          if (diffMs > 0 && diffMs <= 30 * 60 * 1000) {
            score += 20;
            breakdown.push("Speed bonus (+20)");
          }
        }
      }

      return {
        id: v.id,
        name: v.name,
        email: v.email,
        uniqueIdentifier: v.uniqueIdentifier,
        isEligible: v.isEligible,
        electionName: v.election.name,
        electionStatus: v.election.status,
        verified: !!verified,
        voted: !!voted,
        score,
        breakdown,
      };
    });

    // Sort by score descending
    const leaderboard = scored
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    // Aggregate metrics
    const totalVoters = voters.length;
    const verifiedCount = voters.filter((v) => v.verificationAttempts.length > 0).length;
    const votedCount = voters.filter((v) => v.votingSessions.length > 0).length;
    const avgScore =
      totalVoters > 0
        ? Math.round(scored.reduce((s, v) => s + v.score, 0) / totalVoters)
        : 0;
    const topScore = leaderboard[0]?.score ?? 0;

    // Score distribution buckets
    const buckets = [
      { label: "0 — No activity", count: scored.filter((v) => v.score === 0).length },
      { label: "1-30 — Verified", count: scored.filter((v) => v.score > 0 && v.score <= 30).length },
      { label: "31-80 — Voted", count: scored.filter((v) => v.score > 30 && v.score <= 80).length },
      { label: "81-100 — Speed voter", count: scored.filter((v) => v.score > 80).length },
    ];

    return ok({
      leaderboard,
      summary: {
        totalVoters,
        verifiedCount,
        votedCount,
        avgScore,
        topScore,
        engagementRate:
          totalVoters > 0
            ? Math.round((votedCount / totalVoters) * 1000) / 10
            : 0,
      },
      distribution: buckets,
    });
  } catch (e) {
    return handleError(e);
  }
}

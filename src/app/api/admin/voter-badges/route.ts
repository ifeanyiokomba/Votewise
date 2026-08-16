import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt: string | null;
}

/**
 * Voter engagement badges API.
 *
 * Awards digital badges based on engagement patterns:
 *   - "first_vote" — Cast their first ballot
 *   - "verified_citizen" — Completed OTP verification
 *   - "speed_voter" — Voted within 30 min of verification
 *   - "early_bird" — Voted within the first hour of election going live
 *   - "streak_voter" — Voted in 2+ elections
 *   - "completionist" — Voted in all positions on the ballot
 *   - "loyal_voter" — Participated in 3+ elections
 */
export async function GET() {
  try {
    const user = await requireOrgMember();

    const voters = await db.voter.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        electionId: true,
        election: {
          select: { id: true, name: true, status: true, startTime: true },
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
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Group by email for cross-election badges
    const byEmail = new Map<string, typeof voters>();
    for (const v of voters) {
      const key = v.email?.trim() || v.id;
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(v);
    }

    // Compute badges per voter
    const allBadges: {
      voterId: string;
      voterName: string;
      voterEmail: string;
      badges: Badge[];
      badgeCount: number;
    }[] = [];

    for (const [email, voterRecords] of byEmail) {
      const first = voterRecords[0];
      const badges: Badge[] = [];

      const verified = voterRecords.some((v) => v.verificationAttempts.length > 0);
      const voted = voterRecords.some((v) => v.votingSessions.length > 0);
      const electionCount = voterRecords.length;
      const voteCount = voterRecords.filter((v) => v.votingSessions.length > 0).length;

      // First vote badge
      const firstVoteSession = voterRecords
        .flatMap((v) => v.votingSessions)
        .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())[0];
      badges.push({
        id: "first_vote",
        label: "First Vote",
        description: "Cast your first ballot",
        icon: "Vote",
        color: "emerald",
        earned: voted,
        earnedAt: firstVoteSession?.completedAt ?? null,
      });

      // Verified citizen badge
      const firstVerification = voterRecords
        .flatMap((v) => v.verificationAttempts)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      badges.push({
        id: "verified_citizen",
        label: "Verified Citizen",
        description: "Completed OTP verification",
        icon: "BadgeCheck",
        color: "sky",
        earned: verified,
        earnedAt: firstVerification?.createdAt ?? null,
      });

      // Speed voter badge — voted within 30 min of verification
      let speedEarned = false;
      let speedDate: string | null = null;
      if (verified && voted && firstVerification && firstVoteSession) {
        const diff = new Date(firstVoteSession.completedAt!).getTime() - new Date(firstVerification.createdAt).getTime();
        if (diff > 0 && diff <= 30 * 60 * 1000) {
          speedEarned = true;
          speedDate = firstVoteSession.completedAt;
        }
      }
      badges.push({
        id: "speed_voter",
        label: "Speed Voter",
        description: "Voted within 30 min of verification",
        icon: "Zap",
        color: "amber",
        earned: speedEarned,
        earnedAt: speedDate,
      });

      // Early bird badge — voted within first hour of election going live
      let earlyBirdEarned = false;
      let earlyBirdDate: string | null = null;
      for (const v of voterRecords) {
        if (v.votingSessions.length > 0 && v.election.startTime) {
          const electionStart = new Date(v.election.startTime).getTime();
          const voteTime = new Date(v.votingSessions[0].completedAt!).getTime();
          if (voteTime - electionStart <= 60 * 60 * 1000 && voteTime >= electionStart) {
            earlyBirdEarned = true;
            earlyBirdDate = v.votingSessions[0].completedAt;
            break;
          }
        }
      }
      badges.push({
        id: "early_bird",
        label: "Early Bird",
        description: "Voted within the first hour",
        icon: "Sunrise",
        color: "orange",
        earned: earlyBirdEarned,
        earnedAt: earlyBirdDate,
      });

      // Streak voter — voted in 2+ elections
      badges.push({
        id: "streak_voter",
        label: "Streak Voter",
        description: "Voted in 2+ elections",
        icon: "Flame",
        color: "rose",
        earned: voteCount >= 2,
        earnedAt: voteCount >= 2 ? firstVoteSession?.completedAt : null,
      });

      // Loyal voter — participated in 3+ elections
      badges.push({
        id: "loyal_voter",
        label: "Loyal Voter",
        description: "Participated in 3+ elections",
        icon: "Crown",
        color: "violet",
        earned: electionCount >= 3,
        earnedAt: electionCount >= 3 ? firstVoteSession?.completedAt : null,
      });

      const earnedBadges = badges.filter((b) => b.earned);
      if (earnedBadges.length > 0) {
        allBadges.push({
          voterId: first.id,
          voterName: first.name,
          voterEmail: email,
          badges,
          badgeCount: earnedBadges.length,
        });
      }
    }

    // Sort by badge count
    allBadges.sort((a, b) => b.badgeCount - a.badgeCount);

    // Aggregate badge distribution
    const badgeDistribution: Record<string, number> = {};
    for (const v of allBadges) {
      for (const b of v.badges) {
        if (b.earned) {
          badgeDistribution[b.id] = (badgeDistribution[b.id] ?? 0) + 1;
        }
      }
    }

    const totalVoters = byEmail.size;
    const votersWithBadges = allBadges.length;
    const totalBadgesAwarded = Object.values(badgeDistribution).reduce((s, n) => s + n, 0);

    return ok({
      voters: allBadges.slice(0, 50),
      distribution: badgeDistribution,
      summary: {
        totalVoters,
        votersWithBadges,
        totalBadgesAwarded,
        avgBadgesPerVoter:
          votersWithBadges > 0
            ? Math.round((totalBadgesAwarded / votersWithBadges) * 10) / 10
            : 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

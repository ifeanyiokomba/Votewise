import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Cross-election unified voter identity view.
 *
 * Groups voters across elections by email (or phone if no email) to show
 * a unified identity — how many elections a person participated in, their
 * total verification/vote count, and aggregate engagement.
 */
export async function GET(request: Request) {
  try {
    const user = await requireOrgMember();
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;

    const voters = await db.voter.findMany({
      where: {
        organizationId: user.organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { uniqueIdentifier: { contains: search } },
                { matricNumber: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        matricNumber: true,
        uniqueIdentifier: true,
        department: true,
        faculty: true,
        level: true,
        electionId: true,
        election: {
          select: { id: true, name: true, status: true },
        },
        verificationAttempts: {
          where: { status: "VERIFIED" },
          select: { id: true },
        },
        votingSessions: {
          where: { isActive: false, completedAt: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Group by email (or phone fallback, or uniqueIdentifier)
    const identityMap = new Map<
      string,
      {
        key: string;
        name: string;
        email: string | null;
        phone: string | null;
        matricNumber: string | null;
        department: string | null;
        faculty: string | null;
        level: string | null;
        elections: {
          electionId: string;
          electionName: string;
          electionStatus: string;
          verified: boolean;
          voted: boolean;
        }[];
        totalVerified: number;
        totalVoted: number;
        electionCount: number;
      }
    >();

    for (const v of voters) {
      const key = v.email?.trim() || v.phone?.trim() || v.uniqueIdentifier.trim();
      const existing = identityMap.get(key);

      const verified = v.verificationAttempts.length > 0;
      const voted = v.votingSessions.length > 0;

      const electionEntry = {
        electionId: v.electionId,
        electionName: v.election.name,
        electionStatus: v.election.status,
        verified,
        voted,
      };

      if (existing) {
        existing.elections.push(electionEntry);
        existing.totalVerified += verified ? 1 : 0;
        existing.totalVoted += voted ? 1 : 0;
        existing.electionCount = existing.elections.length;
        // Keep the most recent name/department info
        if (!existing.department && v.department) existing.department = v.department;
        if (!existing.faculty && v.faculty) existing.faculty = v.faculty;
        if (!existing.level && v.level) existing.level = v.level;
      } else {
        identityMap.set(key, {
          key,
          name: v.name,
          email: v.email,
          phone: v.phone,
          matricNumber: v.matricNumber,
          department: v.department,
          faculty: v.faculty,
          level: v.level,
          elections: [electionEntry],
          totalVerified: verified ? 1 : 0,
          totalVoted: voted ? 1 : 0,
          electionCount: 1,
        });
      }
    }

    // Convert to array and sort by election count (most engaged first)
    const unified = Array.from(identityMap.values())
      .sort((a, b) => b.electionCount - a.electionCount || b.totalVoted - a.totalVoted)
      .slice(0, 100);

    // Aggregate stats
    const totalIdentities = identityMap.size;
    const multiElectionVoters = Array.from(identityMap.values()).filter(
      (v) => v.electionCount > 1
    ).length;
    const totalParticipations = voters.length;
    const crossElectionVoters = Array.from(identityMap.values()).filter(
      (v) => v.totalVoted > 1
    ).length;

    return ok({
      voters: unified,
      summary: {
        totalIdentities,
        multiElectionVoters,
        totalParticipations,
        crossElectionVoters,
        avgElectionsPerVoter:
          totalIdentities > 0
            ? Math.round((totalParticipations / totalIdentities) * 10) / 10
            : 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

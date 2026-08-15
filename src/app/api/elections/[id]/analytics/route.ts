import { ok, handleError } from "@/lib/api-response";
import { ElectionService } from "@/services/election.service";
import { OrganizationService } from "@/services/organization.service";
import { ResultService } from "@/services/result.service";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const [stats, timeline, results, demographics] = await Promise.all([
      ElectionService.stats(id),
      ElectionService.timeline(id),
      ResultService.computeElectionResults(id),
      computeDemographics(id),
    ]);

    return ok({ stats, timeline, results, demographics });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Compute voter demographic breakdowns (faculty, department, level)
 * with verified/voted counts per group. Voter-identifying details are
 * aggregated — no individual voter data is exposed.
 */
async function computeDemographics(electionId: string) {
  const voters = await db.voter.findMany({
    where: { electionId },
    select: {
      id: true,
      faculty: true,
      department: true,
      level: true,
    },
  });

  const voterIds = voters.map((v) => v.id);
  const verified = await db.verificationAttempt.findMany({
    where: { voterId: { in: voterIds }, status: "VERIFIED" },
    select: { voterId: true },
  });
  const voted = await db.votingSession.findMany({
    where: { voterId: { in: voterIds }, isActive: false, completedAt: { not: null } },
    select: { voterId: true },
  });

  const verifiedSet = new Set(verified.map((v) => v.voterId));
  const votedSet = new Set(voted.map((v) => v.voterId));

  const groupBy = (field: "faculty" | "department" | "level") => {
    const map = new Map<string, { total: number; verified: number; voted: number }>();
    for (const v of voters) {
      const key = v[field]?.trim() || "Unspecified";
      const entry = map.get(key) ?? { total: 0, verified: 0, voted: 0 };
      entry.total++;
      if (verifiedSet.has(v.id)) entry.verified++;
      if (votedSet.has(v.id)) entry.voted++;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([label, counts]) => ({ label, ...counts }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    byFaculty: groupBy("faculty"),
    byDepartment: groupBy("department"),
    byLevel: groupBy("level"),
  };
}

import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await requireOrgMember();
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const electionId = url.searchParams.get("electionId") ?? undefined;
    const eligibility = url.searchParams.get("eligibility") ?? undefined;

    const where = {
      organizationId: user.organizationId,
      ...(electionId ? { electionId } : {}),
      ...(eligibility === "eligible"
        ? { isEligible: true }
        : eligibility === "ineligible"
          ? { isEligible: false }
          : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { uniqueIdentifier: { contains: search } },
              { matricNumber: { contains: search } },
              { department: { contains: search } },
              { faculty: { contains: search } },
            ],
          }
        : {}),
    };

    const [voters, total] = await Promise.all([
      db.voter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          election: {
            select: { id: true, name: true, status: true },
          },
          _count: {
            select: {
              verificationAttempts: true,
              votingSessions: true,
            },
          },
        },
      }),
      db.voter.count({ where }),
    ]);

    // Compute verified/voted status
    const voterIds = voters.map((v) => v.id);
    const verifiedAttempts = await db.verificationAttempt.findMany({
      where: {
        voterId: { in: voterIds },
        status: "VERIFIED",
      },
      select: { voterId: true },
    });
    const completedSessions = await db.votingSession.findMany({
      where: {
        voterId: { in: voterIds },
        isActive: false,
        completedAt: { not: null },
      },
      select: { voterId: true },
    });

    const verifiedSet = new Set(verifiedAttempts.map((a) => a.voterId));
    const votedSet = new Set(completedSessions.map((s) => s.voterId));

    const enriched = voters.map((v) => ({
      ...v,
      isVerified: verifiedSet.has(v.id),
      hasVoted: votedSet.has(v.id),
    }));

    return ok({ voters: enriched, total });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Shared voter activity dashboard for org admin and members.
 * Shows every voter's activity up until they voted — but does NOT
 * reveal which candidate they voted for.
 *
 * Admins and members can:
 * - See voter name, verification status, vote status, timestamps
 * - Resend OTP to a specific voter via a specific channel
 * - Cannot see candidate choices (ballot secrecy preserved)
 */
export async function GET(request: Request) {
  try {
    const user = await requireOrgMember();
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");

    const where = {
      organizationId: user.organizationId,
      ...(electionId ? { electionId } : {}),
    };

    const voters = await db.voter.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        uniqueIdentifier: true,
        isEligible: true,
        electionId: true,
        election: { select: { id: true, name: true, status: true } },
        verificationAttempts: {
          where: { status: "VERIFIED" },
          select: { id: true, createdAt: true, channel: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        votingSessions: {
          where: { isActive: false, completedAt: { not: null } },
          select: { id: true, startedAt: true, completedAt: true },
          take: 1,
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Enrich — show activity status WITHOUT candidate choice
    const activities = voters.map((v) => {
      const verified = v.verificationAttempts[0];
      const voted = v.votingSessions[0];
      return {
        voterId: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        uniqueIdentifier: v.uniqueIdentifier,
        isEligible: v.isEligible,
        election: v.election,
        status: voted ? "VOTED" : verified ? "VERIFIED" : "REGISTERED",
        verifiedAt: verified?.createdAt ?? null,
        verifiedChannel: verified?.channel ?? null,
        votedAt: voted?.completedAt ?? null,
        voteDuration: (verified && voted)
          ? Math.round((new Date(voted.completedAt!).getTime() - new Date(verified.createdAt).getTime()) / 1000)
          : null,
        // NOTE: candidateId / ballot choice is NEVER included
      };
    });

    // Summary
    const total = activities.length;
    const registered = activities.filter((a) => a.status === "REGISTERED").length;
    const verified = activities.filter((a) => a.status === "VERIFIED").length;
    const voted = activities.filter((a) => a.status === "VOTED").length;

    return ok({
      activities,
      summary: { total, registered, verified, voted },
    });
  } catch (e) {
    return handleError(e);
  }
}

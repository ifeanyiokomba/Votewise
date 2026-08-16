import { ok, handleError } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    // Prioritize election-specific events (resourceId matches the election id
    // OR resource is voter/candidate/position/negotiation linked to this election),
    // then fall back to recent org-wide events for context.
    const [electionLogs, orgLogs] = await Promise.all([
      db.auditLog.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { resourceId: id },
            { resource: "election", resourceId: id },
            { resource: "voter", resourceId: id },
            { resource: "candidate", resourceId: id },
            { resource: "position", resourceId: id },
            { resource: "negotiation", resourceId: id },
            { resource: "activation", resourceId: id },
          ],
        },
        orderBy: { timestamp: "desc" },
        take: 60,
      }),
      db.auditLog.findMany({
        where: {
          organizationId: user.organizationId,
          resourceId: { not: id },
          action: { in: ["ELECTION_CREATE", "ELECTION_ACTIVATE", "ELECTION_PUBLISH", "VOTE_CAST", "RESULT_PUBLISHED"] },
        },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
    ]);

    // Merge & dedupe, election-specific first
    const seen = new Set<string>();
    const merged = [...electionLogs, ...orgLogs].filter((log) => {
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    });

    return ok({ logs: merged });
  } catch (e) {
    return handleError(e);
  }
}

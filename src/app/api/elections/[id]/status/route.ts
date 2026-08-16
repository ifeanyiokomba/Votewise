import { ok, handleError } from "@/lib/api-response";
import { ElectionService } from "@/services/election.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    const election = await OrganizationService.getElectionOrFail(
      id,
      user.organizationId!
    );
    const body = await request.json().catch(() => ({}));
    const target = body.status as string;

    // Convenience: if moving to LIVE, ensure activation/payment completed (unless FREE plan).
    if (target === "LIVE") {
      const org = await db.organization.findUnique({
        where: { id: user.organizationId },
        select: { subscriptionTier: true },
      });
      if (org && org.subscriptionTier !== "FREE") {
        const activation = await db.commercialActivation.findUnique({
          where: { electionId: id },
        });
        if (!activation || activation.status !== "PAYMENT_VERIFIED") {
          return ok(
            {
              activationRequired: true,
              message:
                "Election must be activated (payment or negotiation approved) before going live.",
            },
            200
          );
        }
      }
    }

    const updated = await ElectionService.transition(id, target);

    const actionMap: Record<string, "ELECTION_ACTIVATE" | "ELECTION_PAUSE" | "ELECTION_CLOSE" | "ELECTION_PUBLISH" | "ELECTION_ARCHIVE"> = {
      LIVE: "ELECTION_ACTIVATE",
      PAUSED: "ELECTION_PAUSE",
      CLOSED: "ELECTION_CLOSE",
      PUBLISHED: "ELECTION_PUBLISH",
      ARCHIVED: "ELECTION_ARCHIVE",
    };
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: actionMap[target] ?? "ELECTION_UPDATE",
      resource: "election",
      resourceId: id,
      result: "SUCCESS",
      metadata: { from: election.status, to: target },
    });

    return ok({ election: updated });
  } catch (e) {
    return handleError(e);
  }
}

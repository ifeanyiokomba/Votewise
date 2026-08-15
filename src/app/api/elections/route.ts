import { ok, handleError } from "@/lib/api-response";
import { electionSchema } from "@/lib/validators";
import { ElectionService } from "@/services/election.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const elections = await ElectionService.listForOrg(user.organizationId!);
    return ok({ elections });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();

    // Enforce plan limits
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { subscriptionTier: true },
    });
    const limits: Record<string, number> = {
      FREE: 1,
      STARTER: 5,
      PROFESSIONAL: 25,
      ENTERPRISE: 9999,
    };
    const activeLimit = limits[org?.subscriptionTier ?? "FREE"] ?? 1;
    const activeCount = await db.election.count({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ["CLOSED", "PUBLISHED", "ARCHIVED"] },
      },
    });
    if (activeCount >= activeLimit) {
      return ok(
        {
          limitExceeded: true,
          message: `Your plan allows ${activeLimit} active election(s). Upgrade to create more.`,
        },
        200
      );
    }

    const body = await request.json();
    const parsed = electionSchema.parse(body);

    const election = await ElectionService.create(user.organizationId!, {
      name: parsed.name,
      description: parsed.description ?? null,
      type: parsed.type,
      startTime: parsed.startTime ? new Date(parsed.startTime) : null,
      endTime: parsed.endTime ? new Date(parsed.endTime) : null,
      timezone: parsed.timezone,
    });

    await ElectionService.transition(election.id, "CONFIGURATION");

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "ELECTION_CREATE",
      resource: "election",
      resourceId: election.id,
      result: "SUCCESS",
      metadata: { name: election.name },
    });

    return ok({ election }, 201);
  } catch (e) {
    return handleError(e);
  }
}

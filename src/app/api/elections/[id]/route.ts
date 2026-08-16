import { ok, handleError } from "@/lib/api-response";
import { electionSchema } from "@/lib/validators";
import { ElectionService } from "@/services/election.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    const election = await ElectionService.get(id);
    if (!election || election.organizationId !== user.organizationId) {
      return ok({ election: null });
    }
    return ok({ election });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const body = await request.json();
    const parsed = electionSchema.partial().parse(body);

    const election = await ElectionService.update(id, {
      name: parsed.name,
      description: parsed.description ?? null,
      type: parsed.type,
      startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
      endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
      timezone: parsed.timezone,
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "ELECTION_UPDATE",
      resource: "election",
      resourceId: id,
      result: "SUCCESS",
    });

    return ok({ election });
  } catch (e) {
    return handleError(e);
  }
}

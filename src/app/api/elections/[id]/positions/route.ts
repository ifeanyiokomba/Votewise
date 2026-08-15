import { ok, handleError } from "@/lib/api-response";
import { positionSchema } from "@/lib/validators";
import { PositionService } from "@/services/position.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const positions = await PositionService.listForElection(id);
    return ok({ positions });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const body = await request.json();
    const parsed = positionSchema.parse(body);
    const position = await PositionService.create(id, parsed);
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "CANDIDATE_CREATE",
      resource: "position",
      resourceId: position.id,
      result: "SUCCESS",
    });
    return ok({ position }, 201);
  } catch (e) {
    return handleError(e);
  }
}

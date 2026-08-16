import { ok, handleError, fail } from "@/lib/api-response";
import { positionSchema } from "@/lib/validators";
import { PositionService } from "@/services/position.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string; positionId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id, positionId } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const body = await request.json();
    const parsed = positionSchema.partial().parse(body);
    const position = await PositionService.update(positionId, parsed);
    return ok({ position });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id, positionId } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    await PositionService.delete(positionId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

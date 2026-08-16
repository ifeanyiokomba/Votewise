import { ok, handleError } from "@/lib/api-response";
import { candidateSchema } from "@/lib/validators";
import { CandidateService } from "@/services/candidate.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string; candidateId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id, candidateId } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const body = await request.json();
    const parsed = candidateSchema.partial().parse(body);
    const candidate = await CandidateService.update(candidateId, parsed);
    return ok({ candidate });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id, candidateId } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    await CandidateService.delete(candidateId);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

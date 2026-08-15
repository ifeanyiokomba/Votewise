import { ok, handleError } from "@/lib/api-response";
import { candidateSchema } from "@/lib/validators";
import { CandidateService } from "@/services/candidate.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const candidates = await CandidateService.listForElection(id);
    return ok({ candidates });
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
    const parsed = candidateSchema.parse(body);
    const candidate = await CandidateService.create(id, parsed);
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "CANDIDATE_CREATE",
      resource: "candidate",
      resourceId: candidate.id,
      result: "SUCCESS",
    });
    return ok({ candidate }, 201);
  } catch (e) {
    return handleError(e);
  }
}

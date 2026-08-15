import { ok, handleError } from "@/lib/api-response";
import { VoterService } from "@/services/voter.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const voters = await VoterService.listForElection(id, { search });
    return ok({ voters });
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
    await VoterService.updateEligibility(body.id, body.eligible);
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "VOTER_UPDATE",
      resource: "voter",
      resourceId: body.id,
      result: "SUCCESS",
      metadata: { eligible: body.eligible },
    });
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

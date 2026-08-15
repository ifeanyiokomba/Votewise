import { ok, handleError } from "@/lib/api-response";
import { ResultService } from "@/services/result.service";
import { ElectionService } from "@/services/election.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    await ResultService.persistResults(id);
    const election = await ElectionService.publishResults(id);

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "RESULT_PUBLISHED",
      resource: "election",
      resourceId: id,
      result: "SUCCESS",
    });

    return ok({ election });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError } from "@/lib/api-response";
import { ElectionService } from "@/services/election.service";
import { OrganizationService } from "@/services/organization.service";
import { ResultService } from "@/services/result.service";
import { requireOrgMember } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const [stats, timeline, results] = await Promise.all([
      ElectionService.stats(id),
      ElectionService.timeline(id),
      ResultService.computeElectionResults(id),
    ]);

    return ok({ stats, timeline, results });
  } catch (e) {
    return handleError(e);
  }
}

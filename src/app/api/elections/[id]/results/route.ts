import { ok, handleError } from "@/lib/api-response";
import { ResultService } from "@/services/result.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const election = await db.election.findUnique({
      where: { id },
      select: { status: true, config: true },
    });
    const config = election?.config ? JSON.parse(election.config) : {};
    // Org members always see results during/after voting in this demo.
    const results = await ResultService.computeElectionResults(id);
    return ok({ results, visible: true });
  } catch (e) {
    return handleError(e);
  }
}

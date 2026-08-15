import { ok, handleError } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; observerId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id, observerId } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    await db.observer.delete({
      where: { id: observerId, electionId: id },
    });

    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const logs = await db.auditLog.findMany({
      where: {
        OR: [
          { organizationId: user.organizationId },
          { resourceId: id, resource: "election" },
        ],
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return ok({ logs });
  } catch (e) {
    return handleError(e);
  }
}

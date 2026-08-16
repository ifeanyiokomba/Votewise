import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { OrganizationService } from "@/services/organization.service";
import { SecurityService } from "@/services/security.service";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const orgId = user.organizationId!;
    const [stats, orgStats, recentEvents, recentAudit, elections] = await Promise.all([
      SecurityService.stats(orgId),
      OrganizationService.stats(orgId),
      SecurityService.listForOrg(orgId, 8),
      db.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { timestamp: "desc" },
        take: 8,
      }),
      db.election.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true },
      }),
    ]);
    return ok({ stats, orgStats, recentEvents, recentAudit, elections });
  } catch (e) {
    return handleError(e);
  }
}

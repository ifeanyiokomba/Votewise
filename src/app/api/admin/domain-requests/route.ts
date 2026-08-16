import { ok, handleError } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Platform Admin: list all domain requests
 */
export async function GET() {
  try {
    await requireRole("PLATFORM_ADMIN");

    const orgs = await db.organization.findMany({
      where: { domainStatus: { not: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        domainStatus: true,
        domainRequestedAt: true,
        domainApprovedAt: true,
        _count: { select: { elections: true } },
      },
      orderBy: { domainRequestedAt: "desc" },
    });

    return ok({ requests: orgs });
  } catch (e) {
    return handleError(e);
  }
}

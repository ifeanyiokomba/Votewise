import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireOrgMember();
    const notifications = await db.notification.findMany({
      where: { election: { organizationId: user.organizationId } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ notifications });
  } catch (e) {
    return handleError(e);
  }
}

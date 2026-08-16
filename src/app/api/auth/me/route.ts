import { ok, handleError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    const organization = user.organizationId
      ? await db.organization.findUnique({
          where: { id: user.organizationId },
          select: { id: true, name: true, slug: true, subscriptionTier: true, logo: true },
        })
      : null;
    return ok({ user, organization });
  } catch (e) {
    return handleError(e);
  }
}

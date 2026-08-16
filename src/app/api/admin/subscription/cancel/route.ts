import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { SubscriptionService } from "@/services/subscription.service";
import { AuditService } from "@/services/audit.service";

export async function POST() {
  try {
    const user = await requireOrgAdmin();
    const subscription = await SubscriptionService.cancel(user.organizationId!);
    if (subscription) {
      await AuditService.log({
        actorId: user.id,
        organizationId: user.organizationId,
        action: "SUBSCRIPTION_CHANGE",
        resource: "subscription",
        resourceId: subscription.id,
        result: "CANCELLED",
      });
    }
    return ok({ cancelled: !!subscription });
  } catch (e) {
    return handleError(e);
  }
}

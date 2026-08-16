import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { SubscriptionService } from "@/services/subscription.service";

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const subscription = await SubscriptionService.getForOrg(user.organizationId!);
    return ok({ subscription });
  } catch (e) {
    return handleError(e);
  }
}

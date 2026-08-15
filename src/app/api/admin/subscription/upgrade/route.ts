import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { SubscriptionService } from "@/services/subscription.service";
import { AuditService } from "@/services/audit.service";
import { generateReference } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const { tier } = body as { tier: string };
    const plan = (tier as string) || "STARTER";
    // Simulated verified payment (server-side only). In production a webhook confirms.
    const amount = plan === "STARTER" ? 25000 : plan === "PROFESSIONAL" ? 150000 : 0;
    const ref = generateReference("SUB");
    const subscription = await SubscriptionService.activate(
      user.organizationId!,
      plan,
      amount,
      ref
    );
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SUBSCRIPTION_CHANGE",
      resource: "subscription",
      resourceId: subscription.id,
      result: "SUCCESS",
      metadata: { tier: plan, amount },
    });
    return ok({ subscription });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { SubscriptionService } from "@/services/subscription.service";
import { AuditService } from "@/services/audit.service";
import { generateReference } from "@/lib/utils";

/**
 * Upgrade subscription tier.
 *
 * SECURITY (F-02): In production, this endpoint does NOT activate the tier
 * directly. It should initialize a Paystack transaction (like election
 * activation) and only the webhook should confirm payment + activate.
 *
 * For now, this endpoint is DISABLED in production — it returns an error
 * telling the admin to contact the platform admin for tier upgrades.
 * In development, it works as before (instant activation for testing).
 */
export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();

    // Block in production — tier upgrades must go through payment verification
    if (process.env.NODE_ENV === "production") {
      return fail(
        "Subscription upgrades require payment verification. Please contact the Votewise platform admin at admin@votewise.com.ng to process your upgrade.",
        "PAYMENT_REQUIRED",
        402
      );
    }

    const body = await request.json();
    const { tier } = body as { tier: string };
    const plan = (tier as string) || "STARTER";
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

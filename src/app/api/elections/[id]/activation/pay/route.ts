import { ok, handleError } from "@/lib/api-response";
import { ActivationService } from "@/services/activation.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Initialize a payment for election activation.
 *
 * SECURITY (Finding #5): This endpoint does NOT mark the payment as completed.
 * It creates a PENDING payment record and returns a Paystack checkout URL.
 * The client redirects to Paystack's hosted checkout page.
 * The webhook (/api/webhooks/paystack) is the ONLY endpoint that can mark
 * a payment as COMPLETED — after HMAC + API verification.
 *
 * If Paystack is not configured (dev mode), falls back to mock behavior.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    // Pass the user's email as the customer email for Paystack
    const payment = await ActivationService.pay(id, user.organizationId!, user.email);

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "PAYMENT_RECEIVED",
      resource: "activation",
      resourceId: id,
      result: "SUCCESS",
      metadata: {
        reference: payment.reference,
        amount: payment.amount,
        gateway: payment.gateway,
        status: payment.status,
      },
    });

    return ok({ payment });
  } catch (e) {
    return handleError(e);
  }
}

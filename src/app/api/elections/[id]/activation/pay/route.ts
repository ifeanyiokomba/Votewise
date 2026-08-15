import { ok, handleError } from "@/lib/api-response";
import { ActivationService } from "@/services/activation.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const payment = await ActivationService.pay(id, user.organizationId!);
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "PAYMENT_RECEIVED",
      resource: "activation",
      resourceId: id,
      result: "SUCCESS",
      metadata: { reference: payment.reference, amount: payment.amount },
    });
    return ok({ payment });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError } from "@/lib/api-response";
import { ActivationService } from "@/services/activation.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { negotiationRequestSchema } from "@/lib/validators";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const body = await request.json();
    const parsed = negotiationRequestSchema.parse(body);
    const negotiation = await ActivationService.requestNegotiation(
      id,
      user.organizationId!,
      parsed
    );
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SUPPORT_TICKET_CREATE",
      resource: "negotiation",
      resourceId: negotiation.id,
      result: "SUCCESS",
    });
    return ok({ negotiation }, 201);
  } catch (e) {
    return handleError(e);
  }
}

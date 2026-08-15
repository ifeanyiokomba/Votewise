import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { SupportService } from "@/services/support.service";
import { supportTicketSchema } from "@/lib/validators";
import { AuditService } from "@/services/audit.service";

export async function GET() {
  try {
    const user = await requireOrgMember();
    const tickets = await SupportService.listForOrg(user.organizationId!);
    return ok({ tickets });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOrgMember();
    const body = await request.json();
    const parsed = supportTicketSchema.parse(body);
    const ticket = await SupportService.create(
      user.organizationId!,
      user.id,
      parsed
    );
    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SUPPORT_TICKET_CREATE",
      resource: "ticket",
      resourceId: ticket.id,
      result: "SUCCESS",
    });
    return ok({ ticket }, 201);
  } catch (e) {
    return handleError(e);
  }
}

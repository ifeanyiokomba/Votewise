import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { SupportService } from "@/services/support.service";
import { supportMessageSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    const ticket = await SupportService.get(id, user.organizationId!);
    if (!ticket) return fail("Ticket not found", "NOT_FOUND", 404);
    return ok({ messages: ticket.messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    const ticket = await SupportService.get(id, user.organizationId!);
    if (!ticket) return fail("Ticket not found", "NOT_FOUND", 404);
    const body = await request.json();
    const parsed = supportMessageSchema.parse(body);
    const isAdmin = ["PLATFORM_ADMIN", "ORG_OWNER", "ORG_ADMIN", "ELECTION_MANAGER", "SUPPORT_AGENT" as never].includes(user.role);
    const message = await SupportService.addMessage(
      id,
      user.id,
      parsed.body,
      parsed.isInternal && isAdmin
    );
    return ok({ message }, 201);
  } catch (e) {
    return handleError(e);
  }
}

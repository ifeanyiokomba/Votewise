import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { SupportService } from "@/services/support.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    const ticket = await SupportService.get(id, user.organizationId!);
    if (!ticket) return fail("Ticket not found", "NOT_FOUND", 404);
    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    const body = await request.json();
    if (body.status) {
      await SupportService.updateStatus(id, body.status);
    }
    if (body.assignedToId) {
      await SupportService.assign(id, body.assignedToId);
    }
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

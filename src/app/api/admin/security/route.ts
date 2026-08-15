import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { SecurityService } from "@/services/security.service";

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const events = await SecurityService.listForOrg(user.organizationId!, 100);
    return ok({ events });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const event = await SecurityService.resolve(body.id);
    return ok({ event });
  } catch (e) {
    return handleError(e);
  }
}

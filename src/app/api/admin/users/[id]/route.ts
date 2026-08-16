import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireOrgAdmin();
    const { id } = await params;
    const body = await request.json();
    if (body.role) {
      await UserService.updateRole(id, body.role);
      await AuditService.log({
        actorId: admin.id,
        organizationId: admin.organizationId,
        action: "ROLE_CHANGE",
        resource: "user",
        resourceId: id,
        result: "SUCCESS",
        metadata: { role: body.role },
      });
    }
    if (typeof body.isActive === "boolean") {
      await UserService.setActive(id, body.isActive);
    }
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

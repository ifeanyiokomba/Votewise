import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const users = await UserService.listForOrg(user.organizationId!);
    return ok({ users });
  } catch (e) {
    return handleError(e);
  }
}

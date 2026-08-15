import { ok, handleError } from "@/lib/api-response";
import { clearSession, getCurrentUser } from "@/lib/session";
import { AuditService } from "@/services/audit.service";

export async function POST() {
  try {
    const user = await getCurrentUser();
    await clearSession();
    if (user) {
      await AuditService.log({
        actorId: user.id,
        organizationId: user.organizationId,
        action: "LOGOUT",
        resource: "auth",
        result: "SUCCESS",
      });
    }
    return ok({ loggedOut: true });
  } catch (e) {
    return handleError(e);
  }
}

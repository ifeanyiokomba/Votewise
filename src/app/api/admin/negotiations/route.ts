import { ok, handleError } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { ActivationService } from "@/services/activation.service";

export async function GET() {
  try {
    await requireRole("PLATFORM_ADMIN");
    const negotiations = await ActivationService.listNegotiations();
    return ok({ negotiations });
  } catch (e) {
    return handleError(e);
  }
}

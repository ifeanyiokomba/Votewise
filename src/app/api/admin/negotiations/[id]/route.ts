import { ok, handleError } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { ActivationService } from "@/services/activation.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole("PLATFORM_ADMIN");
    const { id } = await params;
    const body = await request.json();
    const negotiation = await ActivationService.updateNegotiation(id, body);
    return ok({ negotiation });
  } catch (e) {
    return handleError(e);
  }
}

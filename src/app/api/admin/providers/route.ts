import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { getProviderStatuses } from "@/providers";

/**
 * Returns the status of all notification providers (email, SMS, WhatsApp).
 * Shows which provider is active and whether it's configured.
 */
export async function GET() {
  try {
    await requireOrgAdmin();
    const statuses = getProviderStatuses();
    return ok({ providers: statuses });
  } catch (e) {
    return handleError(e);
  }
}

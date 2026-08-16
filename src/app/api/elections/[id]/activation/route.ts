import { ok, handleError } from "@/lib/api-response";
import { ActivationService } from "@/services/activation.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const activation = await ActivationService.getOrCreateForElection(
      id,
      user.organizationId!
    );

    // Include the organization slug so the dashboard can build the subdomain URL.
    const org = await db.organization.findUnique({
      where: { id: user.organizationId! },
      select: { slug: true, name: true, domain: true, domainStatus: true },
    });

    return ok({ activation, organization: org });
  } catch (e) {
    return handleError(e);
  }
}

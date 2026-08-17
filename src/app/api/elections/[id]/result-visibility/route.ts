import { ok, handleError, fail } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { safeJsonParse } from "@/lib/utils";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

/**
 * Result visibility modes:
 * - LIVE: Show real-time results while voting is in progress
 * - AFTER_CLOSE: Hide results until voting closes (results shown after status → CLOSED)
 * - PUBLISHED_ONLY: Only show results after admin publishes them (status → PUBLISHED)
 */
const visibilitySchema = z.object({
  resultVisibility: z.enum(["LIVE", "AFTER_CLOSE", "PUBLISHED_ONLY"]),
});

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const election = await db.election.findUnique({
      where: { id },
      select: { config: true },
    });

    const config = safeJsonParse<Record<string, unknown>>(election?.config, {});
    const resultVisibility = (config.resultVisibility as string) ?? "PUBLISHED_ONLY";

    return ok({ resultVisibility });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const body = await request.json();
    const parsed = visibilitySchema.parse(body);

    // Fetch current config, merge in the visibility setting
    const election = await db.election.findUnique({
      where: { id },
      select: { config: true },
    });
    const config = safeJsonParse<Record<string, unknown>>(election?.config, {});
    config.resultVisibility = parsed.resultVisibility;

    await db.election.update({
      where: { id },
      data: { config: JSON.stringify(config) },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "ELECTION_UPDATE",
      resource: "election",
      resourceId: id,
      result: "SUCCESS",
      metadata: { resultVisibility: parsed.resultVisibility },
    });

    return ok({ resultVisibility: parsed.resultVisibility });
  } catch (e) {
    return handleError(e);
  }
}

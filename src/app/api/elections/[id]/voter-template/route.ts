import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { OrganizationService } from "@/services/organization.service";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TEMPLATES = ["classic", "modern", "editorial", "minimal", "regal", "civic"] as const;
type TemplateId = (typeof ALLOWED_TEMPLATES)[number];

const templateSchema = z.object({
  voterTemplate: z.enum(ALLOWED_TEMPLATES),
});

/**
 * Get + set the visual voter-page template for an election.
 * Templates are stored in election.config.voterTemplate (string JSON).
 * Default: "classic".
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    const election = await OrganizationService.getElectionOrFail(id, user.organizationId!);
    let config: any = {};
    try { config = JSON.parse(election.config ?? "{}"); } catch { config = {}; }
    const current: TemplateId = (ALLOWED_TEMPLATES as readonly string[]).includes(config.voterTemplate)
      ? config.voterTemplate
      : "classic";
    return ok({ voterTemplate: current, available: ALLOWED_TEMPLATES });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    const election = await OrganizationService.getElectionOrFail(id, user.organizationId!);
    const body = await request.json();
    const parsed = templateSchema.parse(body);

    let config: any = {};
    try { config = JSON.parse(election.config ?? "{}"); } catch { config = {}; }
    config.voterTemplate = parsed.voterTemplate;

    await db.election.update({
      where: { id },
      data: { config: JSON.stringify(config) },
    });

    return ok({ voterTemplate: parsed.voterTemplate });
  } catch (e) {
    return handleError(e);
  }
}

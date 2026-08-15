import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { z } from "zod";

const orgUpdateSchema = z.object({
  name: z.string().min(2, "Organization name is required").max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  logo: z.string().url().nullable().or(z.literal("")).optional(),
  contactInfo: z.string().max(1000).nullable().optional(),
  branding: z.string().max(5000).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        domain: true,
        contactInfo: true,
        branding: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });
    if (!org) return fail("Organization not found", "NOT_FOUND", 404);
    return ok({ organization: org });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const parsed = orgUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.logo !== undefined) updateData.logo = parsed.logo || null;
    if (parsed.contactInfo !== undefined) updateData.contactInfo = parsed.contactInfo;
    if (parsed.branding !== undefined) updateData.branding = parsed.branding;

    const organization = await db.organization.update({
      where: { id: user.organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        domain: true,
        contactInfo: true,
        branding: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: organization.id,
      result: "SUCCESS",
      metadata: { fields: Object.keys(updateData) },
    });

    return ok({ organization });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { z } from "zod";

/**
 * Custom domain management for organizations.
 *
 * An org can use their own domain (e.g. elections.unilag.edu.ng) instead of
 * their Votewise subdomain (unilag.votewise.com.ng).
 *
 * Flow:
 *   1. Org admin enters their custom domain
 *   2. System stores it and provides DNS instructions (CNAME → votewise.com.ng)
 *   3. Once DNS is configured, the domain resolves to Votewise
 *   4. The tenant resolver checks both subdomains AND custom domains
 *   5. After election ends, admin can "revert to subdomain" — removes the
 *      custom domain but keeps all data intact
 */

const domainSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain is too short")
    .max(253, "Domain is too long")
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Enter a valid domain (e.g. elections.unilag.edu.ng)"
    ),
});

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, slug: true, domain: true },
    });

    if (!org) return fail("Organization not found", "NOT_FOUND", 404);

    // Check if domain is unique (not used by another org)
    let domainConflict = false;
    if (org.domain) {
      const conflict = await db.organization.findFirst({
        where: { domain: org.domain, NOT: { id: org.id } },
      });
      domainConflict = !!conflict;
    }

    return ok({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        subdomain: `${org.slug}.votewise.com.ng`,
        domainConflict,
      },
      // DNS instructions for the org to set up their custom domain
      dnsInstructions: {
        recordType: "CNAME",
        name: "@ (or your subdomain)",
        value: "cname.vercel-dns.com",
        note: "Add this CNAME record in your domain's DNS settings. Once propagated, your custom domain will point to Votewise.",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const parsed = domainSchema.parse(body);

    // Normalize domain (lowercase, remove protocol/trailing slash)
    const domain = parsed.domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/^www\./, "");

    // Check if domain is already used by another org
    const existing = await db.organization.findFirst({
      where: { domain, NOT: { id: user.organizationId } },
    });
    if (existing) {
      return fail(
        "This domain is already in use by another organization.",
        "DOMAIN_TAKEN",
        409
      );
    }

    await db.organization.update({
      where: { id: user.organizationId },
      data: { domain },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { field: "domain", value: domain },
    });

    return ok({
      domain,
      message: "Custom domain set. Configure the DNS CNAME record to activate it.",
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    const user = await requireOrgAdmin();

    // Remove the custom domain — reverts to subdomain
    // All data remains intact
    await db.organization.update({
      where: { id: user.organizationId },
      data: { domain: null },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { field: "domain", action: "reverted_to_subdomain" },
    });

    return ok({
      reverted: true,
      message: "Custom domain removed. Your organization will use the Votewise subdomain. All data is intact.",
    });
  } catch (e) {
    return handleError(e);
  }
}

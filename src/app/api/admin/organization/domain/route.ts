import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";
import { APP_URL, APP_DOMAIN } from "@/lib/constants";

/**
 * Custom domain request workflow:
 *
 * 1. Org admin requests a custom domain → status "pending"
 * 2. Platform admin gets notified (in-app + email) with setup instructions
 * 3. Platform admin approves → status "approved", org gets DNS instructions
 * 4. Org configures DNS, domain goes live
 * 5. After election ends, scheduler auto-reverts to subdomain (data intact)
 *
 * The platform admin email is configurable via PLATFORM_ADMIN_EMAIL env var.
 */

const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@votewise.com.ng";

const domainRequestSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain is too short")
    .max(253, "Domain is too long")
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Enter a valid domain (e.g. elections.unilag.edu.ng)"
    ),
  contactName: z.string().min(2, "Contact name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().optional(),
  message: z.string().max(1000).optional(),
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
        domain: true,
        domainStatus: true,
        domainRequestedAt: true,
        domainApprovedAt: true,
      },
    });

    if (!org) return fail("Organization not found", "NOT_FOUND", 404);

    return ok({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        domainStatus: org.domainStatus, // null | "pending" | "approved" | "rejected"
        domainRequestedAt: org.domainRequestedAt,
        domainApprovedAt: org.domainApprovedAt,
        subdomain: `${org.slug}.${APP_DOMAIN}`,
      },
      dnsInstructions: org.domainStatus === "approved" ? {
        recordType: "CNAME",
        name: "@ (or your subdomain, e.g. elections)",
        value: "cname.vercel-dns.com",
        note: "Add this CNAME record in your domain's DNS settings (Cloudflare, GoDaddy, etc.). Once propagated (usually 5-30 minutes), your custom domain will point to Votewise.",
        verificationUrl: `${APP_URL}`,
      } : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const parsed = domainRequestSchema.parse(body);

    // Normalize domain
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
      return fail("This domain is already in use by another organization.", "DOMAIN_TAKEN", 409);
    }

    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, slug: true },
    });

    // Update org with domain request
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        domain,
        domainStatus: "pending",
        domainRequestedAt: new Date(),
        domainApprovedAt: null,
      },
    });

    // ─── Notify Platform Admin ───────────────────────────────
    // 1. In-app notification (shows on platform admin dashboard)
    await db.notification.create({
      data: {
        type: "IN_APP",
        recipient: PLATFORM_ADMIN_EMAIL,
        subject: "New Custom Domain Request",
        body: `${org?.name} (${org?.slug}.votewise.com.ng) has requested to use the custom domain: ${domain}

Contact: ${parsed.contactName} (${parsed.contactEmail})
${parsed.contactPhone ? `Phone: ${parsed.contactPhone}` : ""}
${parsed.message ? `Message: ${parsed.message}` : ""}

Steps to approve:
1. Go to Platform Admin → Domain Requests
2. Review the request
3. Click "Approve" to provide DNS instructions to the org
4. Add the domain to Vercel: Settings → Domains → Add Domain
5. The org will configure their DNS CNAME record

Current subdomain: ${org?.slug}.votewise.com.ng
Requested domain: ${domain}`,
        status: "QUEUED",
        metadata: JSON.stringify({
          kind: "domain_request",
          orgId: user.organizationId,
          orgName: org?.name,
          domain,
          contactName: parsed.contactName,
          contactEmail: parsed.contactEmail,
          contactPhone: parsed.contactPhone,
          message: parsed.message,
        }),
      },
    });

    // 2. Email notification to platform admin
    const emailSubject = `[Votewise] Custom Domain Request — ${org?.name}`;
    const emailBody = `A new custom domain request has been submitted.

Organization: ${org?.name}
Current subdomain: ${org?.slug}.votewise.com.ng
Requested domain: ${domain}

Contact Details:
  Name: ${parsed.contactName}
  Email: ${parsed.contactEmail}
  ${parsed.contactPhone ? `Phone: ${parsed.contactPhone}` : ""}

${parsed.message ? `Message from org: ${parsed.message}` : ""}

─── Next Steps ───
1. Log in to Votewise Platform Admin
2. Go to Domain Requests
3. Review and approve the request
4. Add the domain in Vercel: Settings → Domains → Add Domain
5. The org will receive DNS instructions automatically upon approval

— Votewise Platform
A product of Okomba Inc.`;

    const notif = await NotificationService.queue({
      type: "EMAIL",
      recipient: PLATFORM_ADMIN_EMAIL,
      subject: emailSubject,
      body: emailBody,
      metadata: { kind: "domain_request", domain, orgName: org?.name },
    });
    await NotificationService.dispatch(notif.id);

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { field: "domain", action: "requested", domain },
    });

    return ok({
      domain,
      status: "pending",
      message: "Domain request submitted. The Votewise team will review and approve your request. You'll receive an email once approved with DNS setup instructions.",
    }, 201);
  } catch (e) {
    return handleError(e);
  }
}

// Revert to subdomain (org can do this themselves, or it auto-happens after election)
export async function DELETE() {
  try {
    const user = await requireOrgAdmin();

    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        domain: null,
        domainStatus: null,
        domainRequestedAt: null,
        domainApprovedAt: null,
      },
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
      message: "Custom domain removed. Your organization now uses the Votewise subdomain. All your data is intact.",
    });
  } catch (e) {
    return handleError(e);
  }
}

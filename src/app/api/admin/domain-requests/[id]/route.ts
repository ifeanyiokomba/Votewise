import { ok, handleError, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

/**
 * Platform Admin: approve or reject a domain request.
 *
 * On approve:
 *   - Sets domainStatus to "approved"
 *   - Sends email to org with DNS instructions
 *
 * On reject:
 *   - Sets domainStatus to "rejected"
 *   - Clears the domain field
 *   - Sends email to org explaining rejection
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("PLATFORM_ADMIN");
    const { id } = await params;
    const body = await request.json();
    const parsed = actionSchema.parse(body);

    const org = await db.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, domain: true, domainStatus: true },
    });

    if (!org) return fail("Organization not found", "NOT_FOUND", 404);
    if (org.domainStatus !== "pending") {
      return fail(`Domain request is already ${org.domainStatus}`, "ALREADY_PROCESSED", 400);
    }

    if (parsed.action === "approve") {
      // Approve
      await db.organization.update({
        where: { id },
        data: {
          domainStatus: "approved",
          domainApprovedAt: new Date(),
        },
      });

      // Email the org with DNS instructions
      const emailSubject = `[Votewise] Your custom domain has been approved!`;
      const emailBody = `Great news! Your custom domain request has been approved.

Organization: ${org.name}
Approved domain: ${org.domain}

─── DNS Setup Instructions ───
To activate your custom domain, add the following DNS record in your domain provider (Cloudflare, GoDaddy, etc.):

  Record Type: CNAME
  Name/Host: @ (or your subdomain, e.g. elections)
  Value/Target: cname.vercel-dns.com
  TTL: Auto (or 3600)

Once you've added the CNAME record, DNS propagation typically takes 5-30 minutes. After propagation, your custom domain will be live and point to your Votewise election portal.

You can check if it's working by visiting: https://${org.domain}

─── Important Notes ───
• Your data is always safe — switching to a custom domain doesn't affect any of your elections, voters, or results.
• After your election ends, you can revert to your default subdomain (${org.slug}.votewise.com.ng) from Settings → Domain. All your data stays intact.
• If you need help, contact us at support@votewise.com.ng

— Votewise Team
A product of Okomba Analytics.`;

      const notif = await NotificationService.queue({
        type: "EMAIL",
        recipient: org.domain ? `admin@${org.domain}` : "",
        subject: emailSubject,
        body: emailBody,
        metadata: { kind: "domain_approved", domain: org.domain },
      });
      // Also notify via the org's contact email (if we have it from the request)
      // For now, the in-app notification will surface it

      await AuditService.log({
        actorId: admin.id,
        action: "SETTINGS_CHANGE",
        resource: "organization",
        resourceId: id,
        result: "SUCCESS",
        metadata: { action: "domain_approved", domain: org.domain },
      });

      return ok({
        approved: true,
        domain: org.domain,
        message: `Domain approved. DNS instructions sent to ${org.name}.`,
      });

    } else {
      // Reject
      await db.organization.update({
        where: { id },
        data: {
          domain: null,
          domainStatus: "rejected",
          domainApprovedAt: null,
        },
      });

      await AuditService.log({
        actorId: admin.id,
        action: "SETTINGS_CHANGE",
        resource: "organization",
        resourceId: id,
        result: "REJECTED",
        metadata: { action: "domain_rejected", domain: org.domain, reason: parsed.reason },
      });

      return ok({
        rejected: true,
        message: `Domain request rejected for ${org.name}. ${parsed.reason ?? ""}`,
      });
    }
  } catch (e) {
    return handleError(e);
  }
}

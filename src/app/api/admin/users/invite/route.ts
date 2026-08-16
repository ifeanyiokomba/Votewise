import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { NotificationService } from "@/services/notification.service";
import { EmailTemplates } from "@/lib/email-templates";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { APP_URL } from "@/lib/constants";

const inviteSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ORG_ADMIN", "ELECTION_MANAGER", "ELECTION_OFFICER", "OBSERVER", "AUDITOR", "VOTER"]),
});

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: "Organization Admin",
  ELECTION_MANAGER: "Election Manager",
  ELECTION_OFFICER: "Election Officer",
  OBSERVER: "Observer",
  AUDITOR: "Auditor",
  VOTER: "Voter",
};

/**
 * Invite/add a new member to the organization.
 * Creates a user account linked to the org with the specified role.
 * Sends an email with login credentials to the invited member.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireOrgAdmin();
    const body = await request.json();
    const parsed = inviteSchema.parse(body);

    // Check if user already exists in this org
    const existing = await db.user.findFirst({
      where: { email: parsed.email, organizationId: admin.organizationId },
    });
    if (existing) {
      return fail("A user with this email already exists in your organization.", "DUPLICATE", 409);
    }

    // Fetch organization name for the email
    const org = await db.organization.findUnique({
      where: { id: admin.organizationId },
      select: { name: true, slug: true },
    });

    // Generate a temporary password (user can reset later)
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await db.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash,
        role: parsed.role as never,
        organizationId: admin.organizationId,
        isActive: true,
      },
    });

    // Send invitation email with credentials
    const loginUrl = `${APP_URL}/login`;
    const subject = `You've been invited to ${org?.name ?? "Votewise"} on Votewise`;
    const emailBody = `Hi ${parsed.name},

${admin.name} has invited you to join ${org?.name ?? "their organization"} on Votewise as a ${ROLE_LABELS[parsed.role] ?? parsed.role}.

Here are your login credentials:

  Email: ${parsed.email}
  Temporary password: ${tempPassword}

  Login at: ${loginUrl}

Please log in and change your password as soon as possible. You can do this from Settings → Security after logging in.

If you weren't expecting this invitation, you can safely ignore this email.

— The Votewise Team
  A product of Okomba Inc.`;

    const notification = await NotificationService.queue({
      type: "EMAIL",
      recipient: parsed.email,
      subject,
      body: emailBody,
      metadata: { kind: "invitation", orgSlug: org?.slug },
    });
    await NotificationService.dispatch(notification.id);

    await AuditService.log({
      actorId: admin.id,
      organizationId: admin.organizationId,
      action: "ROLE_CHANGE",
      resource: "user",
      resourceId: user.id,
      result: "SUCCESS",
      metadata: { action: "invited", email: user.email, role: parsed.role, emailSent: true },
    });

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, tempPassword, emailSent: true }, 201);
  } catch (e) {
    return handleError(e);
  }
}

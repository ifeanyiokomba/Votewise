import { db } from "@/lib/db";
import { ok, handleError } from "@/lib/api-response";
import { registerSchema } from "@/lib/validators";
import { ConflictError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { OrganizationService } from "@/services/organization.service";
import { createSession } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import { EmailTemplates } from "@/lib/email-templates";
import { NotificationService } from "@/services/notification.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const existing = await db.user.findFirst({
      where: { email: parsed.email, organizationId: null },
    });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await db.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash,
        role: "ORG_OWNER",
        emailVerified: new Date(),
      },
    });

    const org = await OrganizationService.create({
      name: parsed.organizationName,
      ownerId: user.id,
    });

    await db.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
    });

    const template = EmailTemplates.welcome({
      name: user.name,
      organizationName: org.name,
    });
    const n = await NotificationService.queue({
      type: "EMAIL",
      recipient: user.email,
      subject: template.subject,
      body: template.body,
    });
    await NotificationService.dispatch(n.id);

    await AuditService.log({
      actorId: user.id,
      organizationId: org.id,
      action: "USER_REGISTERED",
      resource: "user",
      resourceId: user.id,
      result: "SUCCESS",
      metadata: { email: user.email, organization: org.slug },
    });

    await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: org.id,
    });

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, organization: { id: org.id, slug: org.slug, name: org.name } });
  } catch (e) {
    return handleError(e);
  }
}

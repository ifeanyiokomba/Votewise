import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import bcrypt from "bcryptjs";
import { z } from "zod";

const inviteSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ORG_ADMIN", "ELECTION_MANAGER", "ELECTION_OFFICER", "OBSERVER", "AUDITOR", "VOTER"]),
});

/**
 * Invite/add a new member to the organization.
 * Creates a user account linked to the org with the specified role.
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

    await AuditService.log({
      actorId: admin.id,
      organizationId: admin.organizationId,
      action: "ROLE_CHANGE",
      resource: "user",
      resourceId: user.id,
      result: "SUCCESS",
      metadata: { action: "invited", email: user.email, role: parsed.role },
    });

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, tempPassword }, 201);
  } catch (e) {
    return handleError(e);
  }
}

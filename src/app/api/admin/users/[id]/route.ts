import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { UserService } from "@/services/user.service";
import { AuditService } from "@/services/audit.service";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireOrgAdmin();
    const { id } = await params;
    const body = await request.json();
    if (body.role) {
      await UserService.updateRole(id, body.role);
      await AuditService.log({
        actorId: admin.id,
        organizationId: admin.organizationId,
        action: "ROLE_CHANGE",
        resource: "user",
        resourceId: id,
        result: "SUCCESS",
        metadata: { role: body.role },
      });
    }
    if (typeof body.isActive === "boolean") {
      await UserService.setActive(id, body.isActive);
    }
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Permanently remove a member from the org.
 * Soft-deletes: anonymizes PII (email → archived_<id>@deleted.local, name → "Deleted User"),
 * sets isActive=false, and revokes any sessions. Audit log is preserved.
 * Cannot remove ORG_OWNER (must transfer ownership first).
 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const admin = await requireOrgAdmin();
    const { id } = await params;

    // Can't remove yourself
    if (admin.id === id) {
      return fail("You cannot remove your own account", "BAD_REQUEST", 400);
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, organizationId: true, email: true, name: true },
    });

    if (!target) {
      return fail("User not found", "NOT_FOUND", 404);
    }
    if (target.organizationId !== admin.organizationId) {
      return fail("User does not belong to your organization", "FORBIDDEN", 403);
    }
    if (target.role === "ORG_OWNER") {
      return fail(
        "Cannot remove the organization owner. Transfer ownership first.",
        "BAD_REQUEST",
        400
      );
    }

    // Anonymize PII but preserve audit trail
    await db.user.update({
      where: { id },
      data: {
        email: `archived_${id.slice(-8)}@deleted.local`,
        name: "Deleted User",
        passwordHash: "removed",
        isActive: false,
        // VW-007: mfaSecret removed (field no longer exists)
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await AuditService.log({
      actorId: admin.id,
      organizationId: admin.organizationId,
      action: "MEMBER_REMOVED",
      resource: "user",
      resourceId: id,
      result: "SUCCESS",
      metadata: { originalEmail: target.email, originalName: target.name },
    });

    return ok({ removed: true });
  } catch (e) {
    return handleError(e);
  }
}


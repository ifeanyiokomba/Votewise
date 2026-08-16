import { db } from "@/lib/db";
import { ok, handleError, fail } from "@/lib/api-response";
import { resetPasswordSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";
import { AuditService } from "@/services/audit.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.parse(body);

    const user = await db.user.findFirst({
      where: { passwordResetToken: parsed.token },
    });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return fail("Reset link is invalid or expired", "INVALID_TOKEN", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "PASSWORD_RESET",
      resource: "user",
      resourceId: user.id,
      result: "SUCCESS",
    });

    return ok({ reset: true });
  } catch (e) {
    return handleError(e);
  }
}

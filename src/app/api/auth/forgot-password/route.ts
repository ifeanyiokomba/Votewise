import { db } from "@/lib/db";
import { ok, handleError } from "@/lib/api-response";
import { forgotPasswordSchema } from "@/lib/validators";
import { generateReference } from "@/lib/utils";
import { EmailTemplates } from "@/lib/email-templates";
import { NotificationService } from "@/services/notification.service";
import { APP_URL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.parse(body);

    // Anti-enumeration: always return ok, regardless of whether user exists.
    const user = await db.user.findFirst({
      where: { email: parsed.email, organizationId: null },
    });

    if (user) {
      const token = generateReference("RESET");
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      await db.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
      const resetUrl = `${APP_URL}/reset-password?token=${token}`;
      const template = EmailTemplates.passwordReset({
        name: user.name,
        resetUrl,
      });
      const n = await NotificationService.queue({
        type: "EMAIL",
        recipient: user.email,
        subject: template.subject,
        body: template.body,
      });
      await NotificationService.dispatch(n.id, { token });
      return ok({
        requested: true,
        ...(process.env.NODE_ENV !== "production"
          ? { devResetUrl: `${APP_URL}/reset-password?token=${token}` }
          : {}),
      });
    }

    return ok({ requested: true });
  } catch (e) {
    return handleError(e);
  }
}

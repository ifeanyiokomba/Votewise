import { db } from "@/lib/db";
import { ok, handleError } from "@/lib/api-response";
import { loginSchema } from "@/lib/validators";
import { UnauthorizedError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { createSession, getClientIp, getUserAgent } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import { SecurityService } from "@/services/security.service";
import { rateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const ip = (await getClientIp()) ?? "unknown";
    const rl = rateLimit(`login:${ip}`, 60_000, 5);
    if (!rl.allowed) throw new RateLimitError("Too many login attempts. Try again in a minute.");

    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const user = await db.user.findFirst({
      where: { email: parsed.email },
    });
    if (!user || !user.passwordHash) {
      await AuditService.log({
        action: "AUTH_FAILURE",
        resource: "auth",
        result: "INVALID_EMAIL",
        metadata: { email: parsed.email },
        ipAddress: ip,
      });
      throw new UnauthorizedError("Invalid email or password");
    }
    if (!user.isActive) {
      throw new UnauthorizedError("Account is disabled. Contact support.");
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) {
      await AuditService.log({
        actorId: user.id,
        organizationId: user.organizationId,
        action: "AUTH_FAILURE",
        resource: "auth",
        result: "INVALID_PASSWORD",
        metadata: { email: parsed.email },
        ipAddress: ip,
      });
      await SecurityService.record({
        type: "FAILED_LOGIN",
        severity: "LOW",
        organizationId: user.organizationId,
        details: { email: parsed.email },
        ipAddress: ip,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "LOGIN",
      resource: "auth",
      result: "SUCCESS",
      ipAddress: ip,
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

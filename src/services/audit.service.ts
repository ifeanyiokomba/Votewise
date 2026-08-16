import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { getClientIp, getUserAgent, getCorrelationId } from "@/lib/session";

export class AuditService {
  static async log(params: {
    actorId?: string;
    organizationId?: string | null;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    result?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }) {
    try {
      const [ipAddress, userAgent, correlationId] = await Promise.all([
        getClientIp(),
        getUserAgent(),
        params.correlationId ?? getCorrelationId(),
      ]);
      await db.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          organizationId: params.organizationId ?? null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId ?? null,
          result: params.result ?? null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          correlationId: correlationId ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch (e) {
      console.error("[audit-log-failed]", e);
    }
  }
}

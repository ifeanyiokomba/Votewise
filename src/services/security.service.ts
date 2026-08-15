import { db } from "@/lib/db";
import { SecurityEventType, Severity } from "@prisma/client";

export class SecurityService {
  static async record(params: {
    type: SecurityEventType;
    severity?: Severity;
    organizationId?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await db.securityEvent.create({
        data: {
          type: params.type,
          severity: params.severity ?? "MEDIUM",
          organizationId: params.organizationId ?? null,
          details: params.details ? JSON.stringify(params.details) : null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (e) {
      console.error("[security-event-record-failed]", e);
    }
  }

  static async listForOrg(organizationId: string, limit = 50) {
    return db.securityEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async resolve(id: string) {
    return db.securityEvent.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }

  static async stats(organizationId: string) {
    const [total, unresolved, critical] = await Promise.all([
      db.securityEvent.count({ where: { organizationId } }),
      db.securityEvent.count({ where: { organizationId, resolved: false } }),
      db.securityEvent.count({
        where: { organizationId, severity: "CRITICAL" },
      }),
    ]);
    return { total, unresolved, critical };
  }
}

import { db } from "@/lib/db";

export class UserService {
  static async listForOrg(organizationId: string) {
    return db.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  static async updateRole(id: string, role: string) {
    return db.user.update({
      where: { id },
      data: { role: role as never },
    });
  }

  static async setActive(id: string, active: boolean) {
    return db.user.update({
      where: { id },
      data: { isActive: active },
    });
  }

  static async stats() {
    const [total, active, admins] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.count({
        where: { role: { in: ["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"] } },
      }),
    ]);
    return { total, active, admins };
  }
}

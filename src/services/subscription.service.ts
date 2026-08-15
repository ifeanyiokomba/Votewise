import { db } from "@/lib/db";
import { generateReference } from "@/lib/utils";

export class SubscriptionService {
  static async getForOrg(organizationId: string) {
    return db.subscription.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  static async activate(
    organizationId: string,
    tier: string,
    amount: number,
    paymentRef: string
  ) {
    const existing = await db.subscription.findFirst({
      where: { organizationId, isActive: true },
    });
    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: { isActive: false, endDate: new Date() },
      });
    }
    const subscription = await db.subscription.create({
      data: {
        organizationId,
        tier: tier as never,
        paymentRef,
        isActive: true,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await db.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        status: "COMPLETED",
        reference: generateReference("SUB"),
        paidAt: new Date(),
      },
    });
    await db.organization.update({
      where: { id: organizationId },
      data: { subscriptionTier: tier as never },
    });
    return subscription;
  }

  static async cancel(organizationId: string) {
    const sub = await db.subscription.findFirst({
      where: { organizationId, isActive: true },
    });
    if (!sub) return null;
    return db.subscription.update({
      where: { id: sub.id },
      data: { isActive: false, endDate: new Date() },
    });
  }
}

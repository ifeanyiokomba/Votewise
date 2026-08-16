import { db } from "@/lib/db";
import { PricingService } from "./pricing.service";
import { generateReference } from "@/lib/utils";

export class ActivationService {
  static async getOrCreateForElection(electionId: string, organizationId: string) {
    const existing = await db.commercialActivation.findUnique({
      where: { electionId },
      include: { payments: true, negotiation: true },
    });
    if (existing) return existing;

    const calc = await PricingService.calculateElectionPrice(electionId);
    return db.commercialActivation.create({
      data: {
        electionId,
        organizationId,
        status: "PAYMENT_REQUIRED",
        voterCount: calc.voterCount,
        applicableRate: calc.applicableRate,
        calculatedAmount: calc.totalAmount,
        currency: calc.currency,
        pricingRule: calc.pricingRule,
        pricingSnapshot: JSON.stringify(PricingService.createSnapshot(calc)),
      },
      include: { payments: true, negotiation: true },
    });
  }

  static async pay(
    electionId: string,
    organizationId: string
  ): Promise<{ reference: string; amount: number; status: string }> {
    const activation = await this.getOrCreateForElection(electionId, organizationId);
    const reference = generateReference("ELE");
    const payment = await db.electionPayment.create({
      data: {
        activationId: activation.id,
        amount: activation.calculatedAmount,
        currency: activation.currency,
        status: "COMPLETED",
        reference,
        paidAt: new Date(),
      },
    });
    await db.commercialActivation.update({
      where: { id: activation.id },
      data: { status: "PAYMENT_VERIFIED", activatedAt: new Date() },
    });
    return {
      reference: payment.reference,
      amount: payment.amount,
      status: payment.status,
    };
  }

  static async requestNegotiation(
    electionId: string,
    organizationId: string,
    input: {
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      message?: string | null;
      proposedAmount?: number | null;
    }
  ) {
    const activation = await this.getOrCreateForElection(electionId, organizationId);
    await db.commercialActivation.update({
      where: { id: activation.id },
      data: { status: "NEGOTIATION_REQUESTED" },
    });
    const standardPrice = activation.calculatedAmount;
    return db.negotiationRequest.create({
      data: {
        activationId: activation.id,
        organizationId,
        electionId,
        status: "REQUESTED",
        voterCount: activation.voterCount,
        standardPrice,
        negotiatedAmount: input.proposedAmount ?? null,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        message: input.message ?? null,
      },
    });
  }

  static async listNegotiations() {
    return db.negotiationRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        election: { select: { name: true, id: true } },
        organization: { select: { name: true, id: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });
  }

  static async updateNegotiation(
    id: string,
    data: { status: string; negotiatedAmount?: number; internalNotes?: string; assignedToId?: string }
  ) {
    return db.negotiationRequest.update({
      where: { id },
      data: {
        status: data.status as never,
        ...(data.negotiatedAmount !== undefined
          ? { negotiatedAmount: data.negotiatedAmount }
          : {}),
        ...(data.internalNotes !== undefined
          ? { internalNotes: data.internalNotes }
          : {}),
        ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
        decidedAt: new Date(),
      },
    });
  }
}

import { db } from "@/lib/db";
import { PricingService } from "./pricing.service";
import { generateReference } from "@/lib/utils";
import { NotificationService } from "./notification.service";

const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@votewise.com.ng";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";
const WHATSAPP_NUMBER = process.env.VOTEWISE_WHATSAPP_NUMBER ?? "+2348000000000";
const PLATFORM_PHONE = process.env.VOTEWISE_PLATFORM_PHONE ?? "+2348000000000";

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
      preferredResponseChannel?: "WHATSAPP" | "PHONE" | "EMAIL" | null;
      message?: string | null;
      proposedAmount?: number | null;
    }
  ) {
    const activation = await this.getOrCreateForElection(electionId, organizationId);

    // Get election + org details for the email
    const [election, org] = await Promise.all([
      db.election.findUnique({ where: { id: electionId }, select: { name: true } }),
      db.organization.findUnique({ where: { id: organizationId }, select: { name: true, slug: true } }),
    ]);

    await db.commercialActivation.update({
      where: { id: activation.id },
      data: { status: "NEGOTIATION_REQUESTED" },
    });
    const standardPrice = activation.calculatedAmount;
    const negotiation = await db.negotiationRequest.create({
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
        preferredResponseChannel: input.preferredResponseChannel ?? null,
        message: input.message ?? null,
      },
    });

    // ─── Email platform admin about the negotiation request ───
    try {
      const channelLabel =
        input.preferredResponseChannel === "WHATSAPP"
          ? "WhatsApp"
          : input.preferredResponseChannel === "PHONE"
            ? "Phone call"
            : "Email";

      const subject = `Negotiation request — ${election?.name ?? "Election"} (${org?.name ?? "Org"})`;
      const body = [
        `A new negotiation request has been submitted.`,
        ``,
        `Organization: ${org?.name ?? "—"}`,
        `Election: ${election?.name ?? "—"}`,
        `Subdomain: ${org?.slug ? `${org.slug}.${APP_DOMAIN}` : "—"}`,
        `Voter count: ${activation.voterCount}`,
        `Standard price: ${activation.currency} ${standardPrice.toLocaleString()}`,
        `Proposed amount: ${input.proposedAmount ? `${activation.currency} ${input.proposedAmount.toLocaleString()}` : "—"}`,
        ``,
        `Contact details:`,
        `  Name: ${input.contactName}`,
        `  Email: ${input.contactEmail}`,
        `  Phone: ${input.contactPhone ?? "—"}`,
        `  Preferred response channel: ${channelLabel}`,
        ``,
        `Message from organization:`,
        `${input.message ?? "(none)"}`,
        ``,
        `— Review and approve at: ${APP_URL}/dashboard/commercial`,
      ].join("\n");

      await NotificationService.send({
        recipient: PLATFORM_ADMIN_EMAIL,
        subject,
        body,
        type: "EMAIL",
      });

      // WhatsApp / phone prompt to platform admin (uses WhatsApp provider if configured)
      if (input.preferredResponseChannel === "WHATSAPP" && input.contactPhone) {
        await NotificationService.send({
          recipient: WHATSAPP_NUMBER,
          subject: `Negotiation: ${election?.name ?? "Election"}`,
          body: `New negotiation request from ${org?.name ?? "Org"}. Contact: ${input.contactName} on WhatsApp ${input.contactPhone}. Reply to discuss activation.`,
          type: "WHATSAPP",
        });
      }
    } catch (err) {
      // Don't fail the request if notification fails
      console.error("[activation] notification failed:", err);
    }

    return negotiation;
  }

  static async listNegotiations() {
    return db.negotiationRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        election: { select: { name: true, id: true } },
        organization: { select: { name: true, id: true, slug: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });
  }

  static async updateNegotiation(
    id: string,
    data: { status: string; negotiatedAmount?: number; internalNotes?: string; assignedToId?: string }
  ) {
    const updated = await db.negotiationRequest.update({
      where: { id },
      data: {
        status: data.status as never,
        ...(data.negotiatedAmount !== undefined ? { negotiatedAmount: data.negotiatedAmount } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes } : {}),
        ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
        decidedAt: new Date(),
      },
      include: { activation: true, election: { select: { id: true, name: true } }, organization: { select: { id: true, name: true, slug: true } } },
    });

    // ─── Auto-activate the election when negotiation is APPROVED ───
    if (data.status === "APPROVED") {
      await db.commercialActivation.update({
        where: { id: updated.activationId },
        data: {
          status: "MANUALLY_APPROVED",
          activatedAt: new Date(),
        },
      });

      // Transition election to READY (admin can then go LIVE)
      // — but only if currently DRAFT
      const election = await db.election.findUnique({
        where: { id: updated.electionId },
        select: { status: true },
      });
      if (election && election.status === "DRAFT") {
        await db.election.update({
          where: { id: updated.electionId },
          data: { status: "READY" },
        });
      }

      // Notify the org admin that the election is activated
      try {
        const orgAdmins = await db.user.findMany({
          where: { organizationId: updated.organizationId, role: { in: ["ORG_OWNER", "ORG_ADMIN"] }, isActive: true },
          select: { email: true },
        });
        const subdomainUrl = updated.organization.slug
          ? `${updated.organization.slug}.${APP_DOMAIN}`
          : `${APP_URL}/org/${updated.organization.slug}`;
        for (const admin of orgAdmins) {
          await NotificationService.send({
            recipient: admin.email,
            subject: `Election Activated — ${updated.election.name}`,
            body: [
              `Good news! Your election "${updated.election.name}" has been activated.`,
              ``,
              `You can now open the activation tab in your dashboard to launch the election.`,
              `Your dedicated voting link: ${subdomainUrl}`,
              ``,
              `— Votewise Platform`,
            ].join("\n"),
            type: "EMAIL",
          });
        }
      } catch (err) {
        console.error("[activation] org notification failed:", err);
      }
    }

    return updated;
  }
}

import { db } from "@/lib/db";

export class SupportService {
  static async listForOrg(organizationId: string) {
    return db.supportTicket.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });
  }

  static async get(id: string, organizationId: string) {
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { name: true, email: true, role: true } } },
        },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });
    if (!ticket || ticket.organizationId !== organizationId) return null;
    return ticket;
  }

  static async create(
    organizationId: string,
    createdById: string,
    input: { subject: string; description: string; priority: string }
  ) {
    return db.supportTicket.create({
      data: {
        subject: input.subject,
        description: input.description,
        priority: input.priority as never,
        organizationId,
        createdById,
        status: "OPEN",
      },
    });
  }

  static async addMessage(
    ticketId: string,
    senderId: string,
    body: string,
    isInternal = false
  ) {
    const message = await db.supportMessage.create({
      data: { ticketId, senderId, body, isInternal },
    });
    await db.supportTicket.update({
      where: { id: ticketId },
      data: { status: "IN_PROGRESS", updatedAt: new Date() },
    });
    return message;
  }

  static async updateStatus(ticketId: string, status: string) {
    return db.supportTicket.update({
      where: { id: ticketId },
      data: { status: status as never, updatedAt: new Date() },
    });
  }

  static async assign(ticketId: string, assignedToId: string) {
    return db.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId, status: "IN_PROGRESS", updatedAt: new Date() },
    });
  }
}

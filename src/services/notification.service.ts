import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { EmailTemplates } from "@/lib/email-templates";

export interface SendNotificationInput {
  type: NotificationType;
  recipient: string;
  subject?: string;
  body: string;
  electionId?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  static async queue(input: SendNotificationInput) {
    return db.notification.create({
      data: {
        type: input.type,
        recipient: input.recipient,
        subject: input.subject ?? null,
        body: input.body,
        status: "QUEUED",
        electionId: input.electionId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  static async markSent(id: string) {
    return db.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  static async markFailed(id: string) {
    return db.notification.update({
      where: { id },
      data: { status: "FAILED" },
    });
  }

  /**
   * In production this dispatches via a real provider (Resend, Termii, WhatsApp).
   * In this environment there is no live provider, so we mark the notification as
   * SENT and surface the OTP body in the notification record for demo/QA purposes.
   */
  static async dispatch(notificationId: string, payload?: { code?: string }) {
    await this.markSent(notificationId);
    return { delivered: true, ...(payload ? { preview: payload } : {}) };
  }

  static async sendVoterOtp(params: {
    voterName: string;
    recipient: string;
    channel: NotificationType;
    code: string;
    electionName: string;
    electionId: string;
  }) {
    const template = EmailTemplates.voterOtp({
      code: params.code,
      electionName: params.electionName,
      voterName: params.voterName,
    });
    const notification = await this.queue({
      type: params.channel,
      recipient: params.recipient,
      subject: template.subject,
      body: template.body,
      electionId: params.electionId,
      metadata: { kind: "otp", channel: params.channel },
    });
    await this.dispatch(notification.id, { code: params.code });
    return notification;
  }
}

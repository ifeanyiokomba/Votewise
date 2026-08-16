import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { EmailTemplates } from "@/lib/email-templates";
import { getEmailProvider, getSMSProvider, getWhatsAppProvider } from "@/providers";

export interface SendNotificationInput {
  type: NotificationType;
  recipient: string;
  subject?: string;
  body: string;
  electionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Provider-agnostic notification service.
 *
 * Reads the active provider from the database (managed via platform admin UI).
 * Providers can be swapped at any time from the admin panel — no code or env changes.
 * If no provider is configured, falls back to mock (always stable).
 */
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

  static async dispatch(notificationId: string, payload?: { code?: string }) {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return { delivered: false, error: "Notification not found" };

    let result: { success: boolean; messageId?: string; error?: string };

    switch (notification.type) {
      case "EMAIL": {
        const provider = await getEmailProvider();
        result = await provider.send({
          to: notification.recipient,
          subject: notification.subject ?? "Votewise Notification",
          body: notification.body,
        });
        break;
      }
      case "SMS": {
        const provider = await getSMSProvider();
        result = await provider.send({
          to: notification.recipient,
          body: notification.body,
        });
        break;
      }
      case "WHATSAPP": {
        const provider = await getWhatsAppProvider();
        result = await provider.send({
          to: notification.recipient,
          body: notification.body,
        });
        break;
      }
      case "IN_APP":
      default:
        await this.markSent(notificationId);
        return { delivered: true, ...(payload ? { preview: payload } : {}) };
    }

    if (result.success) {
      await this.markSent(notificationId);
      return { delivered: true, providerMessageId: result.messageId, ...(payload ? { preview: payload } : {}) };
    } else {
      await this.markFailed(notificationId);
      console.error(`[notification] dispatch failed for ${notificationId}:`, result.error);
      return { delivered: false, error: result.error, ...(payload ? { preview: payload } : {}) };
    }
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

  /**
   * Convenience: queue + immediately dispatch a single notification.
   * Use this for ad-hoc notifications (e.g. negotiation request emails
   * to the platform admin) without going through the OTP flow.
   */
  static async send(input: SendNotificationInput) {
    const notification = await this.queue(input);
    await this.dispatch(notification.id);
    return notification;
  }
}

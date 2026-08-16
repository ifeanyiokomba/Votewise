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
 * This service queues notifications in the database and dispatches them
 * via the active provider (selected via env vars). Providers can be
 * swapped at any time by changing env vars — no code changes needed.
 *
 * Active providers are determined by:
 *   EMAIL_PROVIDER=ses|resend|mock    (default: mock)
 *   SMS_PROVIDER=termii|mock          (default: mock)
 *   WHATSAPP_PROVIDER=termii|mock      (default: mock)
 *
 * If a provider is not configured, the system automatically falls back
 * to the mock provider — guaranteeing stability.
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

  /**
   * Dispatch a notification via the active provider.
   * Routes to the correct provider based on notification type (EMAIL/SMS/WHATSAPP).
   */
  static async dispatch(notificationId: string, payload?: { code?: string }) {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return { delivered: false, error: "Notification not found" };
    }

    let result: { success: boolean; messageId?: string; error?: string };

    switch (notification.type) {
      case "EMAIL": {
        const provider = getEmailProvider();
        result = await provider.send({
          to: notification.recipient,
          subject: notification.subject ?? "Votewise Notification",
          body: notification.body,
        });
        break;
      }

      case "SMS": {
        const provider = getSMSProvider();
        result = await provider.send({
          to: notification.recipient,
          body: notification.body,
        });
        break;
      }

      case "WHATSAPP": {
        const provider = getWhatsAppProvider();
        result = await provider.send({
          to: notification.recipient,
          body: notification.body,
        });
        break;
      }

      case "IN_APP":
      default:
        // In-app notifications don't need a provider — just mark as sent
        await this.markSent(notificationId);
        return { delivered: true, ...(payload ? { preview: payload } : {}) };
    }

    if (result.success) {
      await this.markSent(notificationId);
      return {
        delivered: true,
        providerMessageId: result.messageId,
        ...(payload ? { preview: payload } : {}),
      };
    } else {
      await this.markFailed(notificationId);
      console.error(`[notification] dispatch failed for ${notificationId}:`, result.error);
      return {
        delivered: false,
        error: result.error,
        ...(payload ? { preview: payload } : {}),
      };
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
}

import type { SMSProvider } from "../index";

/**
 * Termii SMS provider.
 *
 * To use:
 *   1. Set SMS_PROVIDER=termii
 *   2. Set TERMII_API_KEY
 *   3. Set TERMII_SENDER_ID (e.g. "Votewise") — must be registered with Termii
 *   4. Set TERMII_CHANNEL (default: "dnd" — use "generic" for non-DND)
 *
 * API docs: https://developers.termii.com/messaging
 */
export class TermiiSMSProvider implements SMSProvider {
  readonly id = "termii";
  readonly name = "Termii";

  private apiKey: string | undefined;
  private senderId: string;
  private channel: string;

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.senderId = process.env.TERMII_SENDER_ID ?? "Votewise";
    this.channel = process.env.TERMII_CHANNEL ?? "dnd";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Termii expects phone numbers in international format without "+" prefix
      const to = params.to.replace(/^\+/, "");

      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: to,
          from: params.from ?? this.senderId,
          sms: params.body,
          type: "plain",
          channel: this.channel,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Termii SMS error (${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();

      if (data.code !== "ok") {
        return {
          success: false,
          error: `Termii SMS failed: ${data.message ?? data.response_description}`,
        };
      }

      return {
        success: true,
        messageId: data.message_id ?? `termii-${Date.now()}`,
      };
    } catch (error) {
      console.error("[Termii SMS] send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Termii SMS send failed",
      };
    }
  }
}

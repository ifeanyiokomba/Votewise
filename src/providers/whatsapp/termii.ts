import type { WhatsAppProvider } from "../index";

/**
 * Termii WhatsApp provider.
 *
 * To use:
 *   1. Set WHATSAPP_PROVIDER=termii
 *   2. Set TERMII_API_KEY (same key as SMS)
 *   3. Set TERMII_WHATSAPP_SENDER (your WhatsApp business number registered with Termii)
 *
 * Uses Termii's WhatsApp messaging API.
 * API docs: https://developers.termii.com/whatsapp
 */
export class TermiiWhatsAppProvider implements WhatsAppProvider {
  readonly id = "termii";
  readonly name = "Termii WhatsApp";

  private apiKey: string | undefined;
  private sender: string | undefined;

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.sender = process.env.TERMII_WHATSAPP_SENDER;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.sender);
  }

  async send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const to = params.to.replace(/^\+/, "");

      const response = await fetch(
        "https://api.ng.termii.com/api/whatsapp/message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: this.apiKey,
            sender: this.sender,
            to: to,
            message: params.body,
            type: "text",
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Termii WhatsApp error (${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();

      if (data.code !== "ok") {
        return {
          success: false,
          error: `Termii WhatsApp failed: ${data.message ?? data.response_description}`,
        };
      }

      return {
        success: true,
        messageId: data.message_id ?? `termii-wa-${Date.now()}`,
      };
    } catch (error) {
      console.error("[Termii WhatsApp] send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Termii WhatsApp send failed",
      };
    }
  }
}

import type { WhatsAppProvider } from "./types";

export class TermiiWhatsAppProvider implements WhatsAppProvider {
  readonly id = "termii";
  readonly name = "Termii (WhatsApp)";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  /**
   * Checks both DB-injected credentials AND env vars.
   */
  isConfigured(): boolean {
    const apiKey = this.creds.apiKey || process.env.TERMII_API_KEY;
    const sender = this.creds.sender || process.env.TERMII_WHATSAPP_SENDER;
    return !!(apiKey && sender);
  }

  async send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.creds.apiKey || process.env.TERMII_API_KEY;
    const sender = this.creds.sender || process.env.TERMII_WHATSAPP_SENDER;

    if (!apiKey || !sender) {
      return { success: false, error: "Termii WhatsApp not configured (need API key + sender)" };
    }

    try {
      const to = params.to.replace(/^\+/, "");
      const response = await fetch("https://api.ng.termii.com/api/whatsapp/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          sender,
          to,
          message: params.body,
          type: "text",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Termii WhatsApp] failed:", response.status, errorBody);
        return { success: false, error: `Termii WhatsApp error (${response.status})` };
      }

      const data = await response.json();
      if (data.code !== "ok") return { success: false, error: data.message ?? "WhatsApp failed" };
      return { success: true, messageId: data.message_id ?? `termii-wa-${Date.now()}` };
    } catch (error) {
      console.error("[Termii WhatsApp] failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "WhatsApp error" };
    }
  }
}

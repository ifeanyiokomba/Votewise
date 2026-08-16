import type { WhatsAppProvider } from "./types";

export class TermiiWhatsAppProvider implements WhatsAppProvider {
  readonly id = "termii";
  readonly name = "Termii (WhatsApp)";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  isConfigured(): boolean {
    return !!(this.creds.apiKey && this.creds.sender);
  }

  async send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const to = params.to.replace(/^\+/, "");
      const response = await fetch("https://api.ng.termii.com/api/whatsapp/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.creds.apiKey,
          sender: this.creds.sender,
          to,
          message: params.body,
          type: "text",
        }),
      });

      if (!response.ok) return { success: false, error: `Termii WhatsApp error (${response.status})` };

      const data = await response.json();
      if (data.code !== "ok") return { success: false, error: data.message ?? "WhatsApp failed" };
      return { success: true, messageId: data.message_id ?? `termii-wa-${Date.now()}` };
    } catch (error) {
      console.error("[Termii WhatsApp] failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "WhatsApp error" };
    }
  }
}

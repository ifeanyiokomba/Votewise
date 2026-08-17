import type { SMSProvider } from "./types";

export class TermiiSMSProvider implements SMSProvider {
  readonly id = "termii";
  readonly name = "Termii (SMS)";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  /**
   * Checks both DB-injected credentials AND env vars.
   */
  isConfigured(): boolean {
    return !!(this.creds.apiKey || process.env.TERMII_API_KEY);
  }

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.creds.apiKey || process.env.TERMII_API_KEY;
    const senderId = params.from ?? this.creds.senderId ?? process.env.TERMII_SENDER_ID ?? "Votewise";
    const channel = this.creds.channel ?? process.env.TERMII_CHANNEL ?? "dnd";

    if (!apiKey) {
      return { success: false, error: "Termii API key not configured" };
    }

    try {
      const to = params.to.replace(/^\+/, "");
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to,
          from: senderId,
          sms: params.body,
          type: "plain",
          channel,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Termii SMS] failed:", response.status, errorBody);
        return { success: false, error: `Termii error (${response.status})` };
      }

      const data = await response.json();
      if (data.code !== "ok") return { success: false, error: data.message ?? "Termii failed" };
      return { success: true, messageId: data.message_id ?? `termii-${Date.now()}` };
    } catch (error) {
      console.error("[Termii SMS] failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Termii error" };
    }
  }
}

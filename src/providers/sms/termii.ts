import type { SMSProvider } from "./types";

export class TermiiSMSProvider implements SMSProvider {
  readonly id = "termii";
  readonly name = "Termii (SMS)";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  isConfigured(): boolean {
    return !!this.creds.apiKey;
  }

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const to = params.to.replace(/^\+/, "");
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.creds.apiKey,
          to,
          from: params.from ?? this.creds.senderId ?? "Votewise",
          sms: params.body,
          type: "plain",
          channel: this.creds.channel ?? "dnd",
        }),
      });

      if (!response.ok) return { success: false, error: `Termii error (${response.status})` };

      const data = await response.json();
      if (data.code !== "ok") return { success: false, error: data.message ?? "Termii failed" };
      return { success: true, messageId: data.message_id ?? `termii-${Date.now()}` };
    } catch (error) {
      console.error("[Termii SMS] failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Termii error" };
    }
  }
}

import type { EmailProvider } from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend";
  readonly name = "Resend";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  isConfigured(): boolean {
    return !!this.creds.apiKey;
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.creds.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: params.from ?? this.creds.fromEmail ?? "noreply@votewise.com.ng",
          to: [params.to],
          subject: params.subject,
          text: params.body,
          html: params.body.replace(/\n/g, "<br>"),
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Resend error (${response.status})` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error("[Resend] send failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Resend error" };
    }
  }
}

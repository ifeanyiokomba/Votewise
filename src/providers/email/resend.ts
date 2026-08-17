import type { EmailProvider } from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend";
  readonly name = "Resend";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  /**
   * Checks both DB-injected credentials AND env vars.
   * This allows production deployments to use RESEND_API_KEY env var
   * without needing to configure via the provider management UI.
   */
  isConfigured(): boolean {
    return !!(this.creds.apiKey || process.env.RESEND_API_KEY);
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.creds.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = params.from ?? this.creds.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "Votewise <noreply@votewise.com.ng>";

    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [params.to],
          subject: params.subject,
          text: params.body,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
<div style="text-align: center; margin-bottom: 32px;">
  <h1 style="color: #4f46e5; font-size: 24px; margin: 0;">Votewise</h1>
  <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Secure Election Platform</p>
</div>
<div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
  <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0;">${params.body}</pre>
</div>
<p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
  This email was sent by Votewise — A product of Okomba Analytics.
</p>
</div>`,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Resend] send failed:", response.status, errorBody);
        return { success: false, error: `Resend error (${response.status}): ${errorBody}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error("[Resend] send failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Resend error" };
    }
  }
}

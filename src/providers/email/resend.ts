import type { EmailProvider } from "../index";

/**
 * Resend email provider (alternative to SES).
 *
 * To use:
 *   1. Set EMAIL_PROVIDER=resend
 *   2. Set RESEND_API_KEY
 *   3. Set RESEND_FROM_EMAIL (e.g. noreply@votewise.com.ng)
 */
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend";
  readonly name = "Resend";

  private apiKey: string | undefined;
  private fromEmail: string | undefined;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@votewise.com.ng";
  }

  isConfigured(): boolean {
    return !!this.apiKey;
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
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: params.from ?? this.fromEmail!,
          to: [params.to],
          subject: params.subject,
          text: params.body,
          html: params.body.replace(/\n/g, "<br>"),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Resend API error (${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      console.error("[Resend] send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Resend send failed",
      };
    }
  }
}

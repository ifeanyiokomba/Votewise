import type { EmailProvider } from "./types";

/**
 * Amazon SES email provider.
 *
 * Credentials can be configured via:
 * 1. DB (via provider management UI) — injected at runtime
 * 2. Environment variables — AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, etc.
 *
 * Env vars take priority for Vercel/serverless deployments where you don't
 * want to store credentials in the database.
 */
export class SESEmailProvider implements EmailProvider {
  readonly id = "ses";
  readonly name = "Amazon SES";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  isConfigured(): boolean {
    const accessKeyId = this.creds.accessKeyId || process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = this.creds.secretAccessKey || process.env.AWS_SES_SECRET_ACCESS_KEY;
    return !!(accessKeyId && secretAccessKey);
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const accessKeyId = this.creds.accessKeyId || process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = this.creds.secretAccessKey || process.env.AWS_SES_SECRET_ACCESS_KEY;
    const region = this.creds.region || process.env.AWS_SES_REGION || "eu-central-1";
    const fromEmail = params.from ?? this.creds.fromEmail ?? process.env.AWS_SES_FROM_EMAIL ?? "noreply@votewise.com.ng";

    if (!accessKeyId || !secretAccessKey) {
      return { success: false, error: "AWS SES credentials not configured" };
    }

    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

      const client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
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
</div>`;

      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: params.body, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
      });

      const response = await client.send(command);
      return { success: true, messageId: response.MessageId };
    } catch (error) {
      console.error("[SES] send failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "SES error" };
    }
  }
}

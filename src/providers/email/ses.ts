import type { EmailProvider } from "./types";

/**
 * Amazon SES email provider.
 * Credentials are injected at runtime from the DB (plug-and-play).
 */
export class SESEmailProvider implements EmailProvider {
  readonly id = "ses";
  readonly name = "Amazon SES";

  private creds: Record<string, string> = {};

  setCredentials(creds: Record<string, string>): void {
    this.creds = creds;
  }

  isConfigured(): boolean {
    return !!(this.creds.accessKeyId && this.creds.secretAccessKey);
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

      const client = new SESClient({
        region: this.creds.region ?? "eu-central-1",
        credentials: {
          accessKeyId: this.creds.accessKeyId,
          secretAccessKey: this.creds.secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: params.from ?? this.creds.fromEmail ?? "noreply@votewise.com.ng",
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: params.body, Charset: "UTF-8" },
            Html: { Data: params.body.replace(/\n/g, "<br>"), Charset: "UTF-8" },
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

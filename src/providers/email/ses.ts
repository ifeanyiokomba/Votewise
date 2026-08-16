import type { EmailProvider } from "../index";

/**
 * Amazon SES email provider.
 *
 * Uses the AWS SDK v3 for SES. To use:
 *   1. Set EMAIL_PROVIDER=ses in your env
 *   2. Set AWS_SES_ACCESS_KEY_ID
 *   3. Set AWS_SES_SECRET_ACCESS_KEY
 *   4. Set AWS_SES_REGION (e.g. eu-central-1)
 *   5. Set AWS_SES_FROM_EMAIL (e.g. noreply@votewise.com.ng)
 *
 * The provider automatically verifies configuration on startup.
 * If not configured, it falls back to MockEmailProvider.
 */
export class SESEmailProvider implements EmailProvider {
  readonly id = "ses";
  readonly name = "Amazon SES";

  private accessKeyId: string | undefined;
  private secretAccessKey: string | undefined;
  private region: string | undefined;
  private fromEmail: string | undefined;

  constructor() {
    this.accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
    this.region = process.env.AWS_SES_REGION ?? "eu-central-1";
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL ?? "noreply@votewise.com.ng";
  }

  isConfigured(): boolean {
    return !!(this.accessKeyId && this.secretAccessKey);
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Dynamically import AWS SDK (avoids loading if not used)
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

      const client = new SESClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId!,
          secretAccessKey: this.secretAccessKey!,
        },
      });

      const command = new SendEmailCommand({
        Source: params.from ?? this.fromEmail!,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: params.body,
              Charset: "UTF-8",
            },
            // Optionally add HTML body
            Html: {
              Data: params.body.replace(/\n/g, "<br>"),
              Charset: "UTF-8",
            },
          },
        },
      });

      const response = await client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      console.error("[SES] send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "SES send failed",
      };
    }
  }
}

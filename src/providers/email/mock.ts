import type { EmailProvider } from "../index";

/**
 * Mock email provider — always succeeds.
 * Used in development and as a fallback when no provider is configured.
 * Logs the email to the console for QA testing.
 */
export class MockEmailProvider implements EmailProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  isConfigured(): boolean {
    return true;
  }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n📧 [MOCK EMAIL] ───────────────────────────────`);
    console.log(`  To:      ${params.to}`);
    console.log(`  From:    ${params.from ?? "noreply@votewise.com.ng"}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Body:    ${params.body.slice(0, 200)}...`);
    console.log(`─────────────────────────────────────────────\n`);

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

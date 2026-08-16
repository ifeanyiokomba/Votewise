import type { SMSProvider } from "../index";

/**
 * Mock SMS provider — always succeeds.
 * Logs the SMS to the console for QA testing.
 */
export class MockSMSProvider implements SMSProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  isConfigured(): boolean {
    return true;
  }

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n📱 [MOCK SMS] ───────────────────────────────`);
    console.log(`  To:   ${params.to}`);
    console.log(`  From: ${params.from ?? "Votewise"}`);
    console.log(`  Body: ${params.body.slice(0, 200)}`);
    console.log(`─────────────────────────────────────────────\n`);

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}

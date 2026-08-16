import type { WhatsAppProvider } from "../index";

/**
 * Mock WhatsApp provider — always succeeds.
 * Logs the WhatsApp message to the console for QA testing.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  isConfigured(): boolean {
    return true;
  }

  async send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n💬 [MOCK WHATSAPP] ────────────────────────────`);
    console.log(`  To:   ${params.to}`);
    console.log(`  Body: ${params.body.slice(0, 200)}`);
    console.log(`─────────────────────────────────────────────\n`);

    return {
      success: true,
      messageId: `mock-wa-${Date.now()}`,
    };
  }
}

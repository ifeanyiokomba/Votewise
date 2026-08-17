import type { SMSProvider } from "./types";

export class MockSMSProvider implements SMSProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  setCredentials(): void {}
  isConfigured(): boolean { return true; }

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n📱 [MOCK SMS] To: ${params.to} | Body: ${params.body.slice(0, 100)}\n`);
    return { success: true, messageId: `mock-sms-${Date.now()}` };
  }
}

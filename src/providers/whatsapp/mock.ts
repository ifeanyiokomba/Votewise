import type { WhatsAppProvider } from "./types";

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  setCredentials(): void {}
  isConfigured(): boolean { return true; }

  async send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n💬 [MOCK WHATSAPP] To: ${params.to} | Body: ${params.body.slice(0, 100)}\n`);
    return { success: true, messageId: `mock-wa-${Date.now()}` };
  }
}

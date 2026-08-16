import type { EmailProvider } from "./types";

export class MockEmailProvider implements EmailProvider {
  readonly id = "mock";
  readonly name = "Mock (Dev Mode)";

  setCredentials(): void {}
  isConfigured(): boolean { return true; }

  async send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`\n📧 [MOCK EMAIL] To: ${params.to} | Subject: ${params.subject}\n  Body: ${params.body.slice(0, 150)}...\n`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }
}

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
    if (process.env.NODE_ENV !== "production") console.log("[MOCK WHATSAPP] sent (dev only)");
    return { success: true, messageId: `mock-wa-${Date.now()}` };
  }
}

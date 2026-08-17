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
    if (process.env.NODE_ENV !== "production") console.log("[MOCK SMS] sent (dev only)");
    return { success: true, messageId: `mock-sms-${Date.now()}` };
  }
}

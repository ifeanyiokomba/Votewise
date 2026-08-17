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
    if (process.env.NODE_ENV !== "production") console.log("[MOCK EMAIL] sent (dev only)");
    return { success: true, messageId: `mock-${Date.now()}` };
  }
}

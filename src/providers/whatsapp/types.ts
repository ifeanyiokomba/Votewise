export interface WhatsAppProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
  setCredentials?(creds: Record<string, string>): void;
}

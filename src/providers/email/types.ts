export interface EmailProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
  /** Inject credentials from DB at runtime */
  setCredentials?(creds: Record<string, string>): void;
}

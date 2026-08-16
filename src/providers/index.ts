/**
 * Provider-agnostic notification interfaces.
 *
 * Each provider type (Email, SMS, WhatsApp) implements a common interface.
 * Providers are selected via environment variables and can be swapped
 * without touching any business logic — just change the env var and
 * the system automatically uses the new provider.
 *
 * To add a new provider:
 *   1. Create a file in the appropriate providers/ subdirectory
 *   2. Implement the interface
 *   3. Register it in the provider factory
 *   4. Set the env var to select it
 *
 * The system is completely stable regardless of which provider is plugged in.
 */

// ─── Email Provider Interface ──────────────────────────────────────

export interface EmailProvider {
  /** Unique provider identifier (e.g. "ses", "resend", "mock") */
  readonly id: string;

  /** Human-readable name for UI */
  readonly name: string;

  /** Whether this provider is properly configured and ready */
  isConfigured(): boolean;

  /** Send an email */
  send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ─── SMS Provider Interface ────────────────────────────────────────

export interface SMSProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;

  send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ─── WhatsApp Provider Interface ──────────────────────────────────

export interface WhatsAppProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;

  send(params: {
    to: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ─── Provider Factory ─────────────────────────────────────────────

/**
 * The provider factory selects the active provider based on environment variables.
 * To switch providers, just change the env var — no code changes needed.
 *
 * Env vars:
 *   EMAIL_PROVIDER=ses|resend|mock    (default: mock)
 *   SMS_PROVIDER=termii|mock          (default: mock)
 *   WHATSAPP_PROVIDER=termii|mock     (default: mock)
 *
 * This guarantees the system is always stable — if a provider env var
 * is not set or the provider is not configured, it falls back to the
 * mock provider which never fails.
 */

import { MockEmailProvider } from "./email/mock";
import { SESEmailProvider } from "./email/ses";
import { ResendEmailProvider } from "./email/resend";
import { TermiiSMSProvider } from "./sms/termii";
import { MockSMSProvider } from "./sms/mock";
import { TermiiWhatsAppProvider } from "./whatsapp/termii";
import { MockWhatsAppProvider } from "./whatsapp/mock";

let _emailProvider: EmailProvider | null = null;
let _smsProvider: SMSProvider | null = null;
let _whatsappProvider: WhatsAppProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (_emailProvider) return _emailProvider;

  const providerId = process.env.EMAIL_PROVIDER?.toLowerCase() ?? "mock";

  const providers: Record<string, EmailProvider> = {
    ses: new SESEmailProvider(),
    resend: new ResendEmailProvider(),
    mock: new MockEmailProvider(),
  };

  const provider = providers[providerId] ?? providers.mock;

  // If the selected provider isn't configured, fall back to mock
  if (!provider.isConfigured() && providerId !== "mock") {
    console.warn(
      `[providers] Email provider "${providerId}" is not configured. Falling back to mock.`
    );
    _emailProvider = providers.mock;
  } else {
    _emailProvider = provider;
  }

  console.log(`[providers] Email provider: ${_emailProvider.id}`);
  return _emailProvider;
}

export function getSMSProvider(): SMSProvider {
  if (_smsProvider) return _smsProvider;

  const providerId = process.env.SMS_PROVIDER?.toLowerCase() ?? "mock";

  const providers: Record<string, SMSProvider> = {
    termii: new TermiiSMSProvider(),
    mock: new MockSMSProvider(),
  };

  const provider = providers[providerId] ?? providers.mock;

  if (!provider.isConfigured() && providerId !== "mock") {
    console.warn(
      `[providers] SMS provider "${providerId}" is not configured. Falling back to mock.`
    );
    _smsProvider = providers.mock;
  } else {
    _smsProvider = provider;
  }

  console.log(`[providers] SMS provider: ${_smsProvider.id}`);
  return _smsProvider;
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (_whatsappProvider) return _whatsappProvider;

  const providerId = process.env.WHATSAPP_PROVIDER?.toLowerCase() ?? "mock";

  const providers: Record<string, WhatsAppProvider> = {
    termii: new TermiiWhatsAppProvider(),
    mock: new MockWhatsAppProvider(),
  };

  const provider = providers[providerId] ?? providers.mock;

  if (!provider.isConfigured() && providerId !== "mock") {
    console.warn(
      `[providers] WhatsApp provider "${providerId}" is not configured. Falling back to mock.`
    );
    _whatsappProvider = providers.mock;
  } else {
    _whatsappProvider = provider;
  }

  console.log(`[providers] WhatsApp provider: ${_whatsappProvider.id}`);
  return _whatsappProvider;
}

// ─── Provider Status (for admin UI) ────────────────────────────────

export interface ProviderStatus {
  type: "EMAIL" | "SMS" | "WHATSAPP";
  providerId: string;
  providerName: string;
  configured: boolean;
}

export function getProviderStatuses(): ProviderStatus[] {
  const email = getEmailProvider();
  const sms = getSMSProvider();
  const whatsapp = getWhatsAppProvider();

  return [
    { type: "EMAIL", providerId: email.id, providerName: email.name, configured: email.isConfigured() },
    { type: "SMS", providerId: sms.id, providerName: sms.name, configured: sms.isConfigured() },
    { type: "WHATSAPP", providerId: whatsapp.id, providerName: whatsapp.name, configured: whatsapp.isConfigured() },
  ];
}

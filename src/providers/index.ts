/**
 * Provider-agnostic notification interfaces.
 *
 * Each provider type (Email, SMS, WhatsApp) implements a common interface.
 * Provider credentials are stored in the database (encrypted) and managed
 * via the platform admin UI — no .env editing or code changes needed.
 *
 * To add a new provider:
 *   1. Create a file in the appropriate providers/ subdirectory
 *   2. Implement the interface
 *   3. Register it in the provider factory below
 *   4. Add its field definitions in the provider config API
 *
 * The system is completely stable — if no provider is configured,
 * it falls back to the mock provider which never fails.
 */

import { db } from "@/lib/db";
import { decryptJSON } from "@/lib/crypto";
import type { EmailProvider } from "./email/types";
import type { SMSProvider } from "./sms/types";
import type { WhatsAppProvider } from "./whatsapp/types";

// Re-export types for convenience
export type { EmailProvider, SMSProvider, WhatsAppProvider };

import { MockEmailProvider } from "./email/mock";
import { SESEmailProvider } from "./email/ses";
import { ResendEmailProvider } from "./email/resend";
import { TermiiSMSProvider } from "./sms/termii";
import { MockSMSProvider } from "./sms/mock";
import { TermiiWhatsAppProvider } from "./whatsapp/termii";
import { MockWhatsAppProvider } from "./whatsapp/mock";

// ─── Cache (refreshed every 30 seconds) ────────────────────────────

let _emailProvider: EmailProvider | null = null;
let _smsProvider: SMSProvider | null = null;
let _whatsappProvider: WhatsAppProvider | null = null;
let _lastCacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

function shouldRefreshCache(): boolean {
  return Date.now() - _lastCacheTime > CACHE_TTL;
}

async function loadProviderConfig(type: string): Promise<Record<string, string> | null> {
  try {
    const config = await db.providerConfig.findFirst({
      where: { type, isActive: true },
    });
    if (!config) return null;
    return decryptJSON<Record<string, string>>(config.credentials);
  } catch (e) {
    console.error(`[providers] Failed to load ${type} config from DB:`, e);
    return null;
  }
}

// ─── Provider Factories ────────────────────────────────────────────

export async function getEmailProvider(): Promise<EmailProvider> {
  if (_emailProvider && !shouldRefreshCache()) return _emailProvider;

  const creds = await loadProviderConfig("EMAIL");
  const providerId = creds?.["__provider"] ?? "mock";

  const providers: Record<string, EmailProvider> = {
    ses: new SESEmailProvider(),
    resend: new ResendEmailProvider(),
    mock: new MockEmailProvider(),
  };

  let provider = providers[providerId] ?? providers.mock;

  if (creds) {
    provider = providers[creds["__provider"] ?? providerId] ?? providers.mock;
    // Inject credentials from DB
    provider.setCredentials?.(creds);
  }

  if (!provider.isConfigured() && providerId !== "mock") {
    console.warn(`[providers] Email provider "${providerId}" not configured. Using mock.`);
    provider = providers.mock;
  }

  _emailProvider = provider;
  _lastCacheTime = Date.now();
  console.log(`[providers] Email: ${provider.id}`);
  return provider;
}

export async function getSMSProvider(): Promise<SMSProvider> {
  if (_smsProvider && !shouldRefreshCache()) return _smsProvider;

  const creds = await loadProviderConfig("SMS");
  const providers: Record<string, SMSProvider> = {
    termii: new TermiiSMSProvider(),
    mock: new MockSMSProvider(),
  };

  let provider = providers.mock;
  if (creds) {
    const providerId = creds["__provider"] ?? "termii";
    provider = providers[providerId] ?? providers.mock;
    provider.setCredentials?.(creds);
  }

  if (!provider.isConfigured() && provider.id !== "mock") {
    provider = providers.mock;
  }

  _smsProvider = provider;
  _lastCacheTime = Date.now();
  return provider;
}

export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  if (_whatsappProvider && !shouldRefreshCache()) return _whatsappProvider;

  const creds = await loadProviderConfig("WHATSAPP");
  const providers: Record<string, WhatsAppProvider> = {
    termii: new TermiiWhatsAppProvider(),
    mock: new MockWhatsAppProvider(),
  };

  let provider = providers.mock;
  if (creds) {
    const providerId = creds["__provider"] ?? "termii";
    provider = providers[providerId] ?? providers.mock;
    provider.setCredentials?.(creds);
  }

  if (!provider.isConfigured() && provider.id !== "mock") {
    provider = providers.mock;
  }

  _whatsappProvider = provider;
  _lastCacheTime = Date.now();
  return provider;
}

export interface ProviderStatus {
  type: "EMAIL" | "SMS" | "WHATSAPP";
  providerId: string;
  providerName: string;
  configured: boolean;
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const email = await getEmailProvider();
  const sms = await getSMSProvider();
  const whatsapp = await getWhatsAppProvider();

  return [
    { type: "EMAIL", providerId: email.id, providerName: email.name, configured: email.isConfigured() },
    { type: "SMS", providerId: sms.id, providerName: sms.name, configured: sms.isConfigured() },
    { type: "WHATSAPP", providerId: whatsapp.id, providerName: whatsapp.name, configured: whatsapp.isConfigured() },
  ];
}

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
    if (!config) {
      console.log(`[providers] No active ${type} config found in DB`);
      return null;
    }

    const creds = decryptJSON<Record<string, string>>(config.credentials);

    // If decryption failed (wrong key), creds will be empty
    if (Object.keys(creds).length === 0) {
      console.error(
        `[providers] ${type} config found in DB but decryption FAILED. ` +
          `The ENCRYPTION_KEY may have changed. Re-enter credentials in the Provider Management UI, ` +
          `or set env vars as fallback.`
      );
      return null;
    }

    return creds;
  } catch (e) {
    console.error(`[providers] Failed to load ${type} config from DB:`, e);
    return null;
  }
}

// ─── Provider Factories ────────────────────────────────────────────

export async function getEmailProvider(): Promise<EmailProvider> {
  if (_emailProvider && !shouldRefreshCache()) return _emailProvider;

  const creds = await loadProviderConfig("EMAIL");

  const providers: Record<string, EmailProvider> = {
    ses: new SESEmailProvider(),
    resend: new ResendEmailProvider(),
    mock: new MockEmailProvider(),
  };

  // Priority: DB config → env var (AWS SES → Resend) → mock
  let provider: EmailProvider;

  if (creds && creds["__provider"]) {
    // DB-configured provider
    provider = providers[creds["__provider"]] ?? providers.ses;
    provider.setCredentials?.(creds);
    if (!provider.isConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[providers] Email provider "${creds["__provider"]}" not configured. Falling back.`);
      }
      provider = providers.mock;
    }
  } else if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    // Env-var configured AWS SES
    provider = providers.ses;
  } else if (process.env.RESEND_API_KEY) {
    // Env-var configured Resend
    provider = providers.resend;
    provider.setCredentials?.({
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    });
  } else {
    // Mock (dev only)
    provider = providers.mock;
  }

  _emailProvider = provider;
  _lastCacheTime = Date.now();
  console.log(`[providers] Email provider: ${provider.id} (configured: ${provider.isConfigured()})`);
  return provider;
}

export async function getSMSProvider(): Promise<SMSProvider> {
  if (_smsProvider && !shouldRefreshCache()) return _smsProvider;

  const creds = await loadProviderConfig("SMS");
  const providers: Record<string, SMSProvider> = {
    termii: new TermiiSMSProvider(),
    mock: new MockSMSProvider(),
  };

  // Priority: DB config → env var (TERMII_API_KEY) → mock
  let provider: SMSProvider;

  if (creds && creds["__provider"]) {
    provider = providers[creds["__provider"]] ?? providers.termii;
    provider.setCredentials?.(creds);
    if (!provider.isConfigured()) {
      provider = providers.mock;
    }
  } else if (process.env.TERMII_API_KEY) {
    provider = providers.termii;
    provider.setCredentials?.({
      apiKey: process.env.TERMII_API_KEY,
      senderId: process.env.TERMII_SENDER_ID,
      channel: process.env.TERMII_CHANNEL,
    });
  } else {
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

  // Priority: DB config → env var (TERMII_API_KEY + TERMII_WHATSAPP_SENDER) → mock
  let provider: WhatsAppProvider;

  if (creds && creds["__provider"]) {
    provider = providers[creds["__provider"]] ?? providers.termii;
    provider.setCredentials?.(creds);
    if (!provider.isConfigured()) {
      provider = providers.mock;
    }
  } else if (process.env.TERMII_API_KEY && process.env.TERMII_WHATSAPP_SENDER) {
    provider = providers.termii;
    provider.setCredentials?.({
      apiKey: process.env.TERMII_API_KEY,
      sender: process.env.TERMII_WHATSAPP_SENDER,
    });
  } else {
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

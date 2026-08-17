import { ok, handleError } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { decryptJSON } from "@/lib/crypto";
import { getEmailProvider, getSMSProvider, getWhatsAppProvider } from "@/providers";

/**
 * Debug endpoint to diagnose provider configuration issues.
 * Shows what's in the DB, whether decryption works, and which provider
 * the factory is actually using.
 *
 * Platform admin only.
 */
export async function GET() {
  try {
    await requireRole("PLATFORM_ADMIN");

    // Check DB provider configs
    const dbConfigs = await db.providerConfig.findMany({
      orderBy: [{ type: "asc" }, { provider: "asc" }],
    });

    const dbStatus = dbConfigs.map((c) => {
      const creds = decryptJSON<Record<string, string>>(c.credentials);
      const hasCreds = Object.keys(creds).length > 0;
      return {
        type: c.type,
        provider: c.provider,
        isActive: c.isActive,
        encryptedCredentialsExist: !!c.credentials,
        decryptionSucceeded: hasCreds,
        credentialKeys: hasCreds ? Object.keys(creds).filter((k) => k !== "__provider") : [],
        hasProviderMarker: !!creds["__provider"],
        encryptionKeySet: !!process.env.ENCRYPTION_KEY,
      };
    });

    // Check env vars
    const envStatus = {
      AWS_SES_ACCESS_KEY_ID: !!process.env.AWS_SES_ACCESS_KEY_ID,
      AWS_SES_SECRET_ACCESS_KEY: !!process.env.AWS_SES_SECRET_ACCESS_KEY,
      AWS_SES_REGION: process.env.AWS_SES_REGION ?? "(not set)",
      AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL ?? "(not set)",
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      TERMII_API_KEY: !!process.env.TERMII_API_KEY,
      TERMII_WHATSAPP_SENDER: !!process.env.TERMII_WHATSAPP_SENDER,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? `${process.env.ENCRYPTION_KEY.slice(0, 8)}...` : "(NOT SET)",
      NODE_ENV: process.env.NODE_ENV ?? "(not set)",
    };

    // Check which provider the factory resolves to
    const emailProvider = await getEmailProvider();
    const smsProvider = await getSMSProvider();
    const whatsappProvider = await getWhatsAppProvider();

    const resolvedProviders = {
      email: { id: emailProvider.id, name: emailProvider.name, configured: emailProvider.isConfigured() },
      sms: { id: smsProvider.id, name: smsProvider.name, configured: smsProvider.isConfigured() },
      whatsapp: { id: whatsappProvider.id, name: whatsappProvider.name, configured: whatsappProvider.isConfigured() },
    };

    return ok({
      dbConfigs: dbStatus,
      envVars: envStatus,
      resolvedProviders,
      diagnosis: {
        emailWillWork:
          resolvedProviders.email.configured && resolvedProviders.email.id !== "mock",
        emailUsingMock: resolvedProviders.email.id === "mock",
        emailUsingEnvVars:
          !!process.env.AWS_SES_ACCESS_KEY_ID || !!process.env.RESEND_API_KEY,
        emailUsingDB: dbStatus.some(
          (c) => c.type === "EMAIL" && c.isActive && c.decryptionSucceeded
        ),
        emailDBDecryptionFailed: dbStatus.some(
          (c) => c.type === "EMAIL" && c.encryptedCredentialsExist && !c.decryptionSucceeded
        ),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

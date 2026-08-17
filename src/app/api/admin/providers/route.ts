import { ok, handleError, fail } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { encryptJSON, decryptJSON } from "@/lib/crypto";
import { z } from "zod";

/**
 * Provider configuration API — platform admin only.
 *
 * This is the "plug and play" interface: admins can add provider credentials
 * (API keys, secrets, etc.) via the UI, and they're stored encrypted in the DB.
 * The provider factory reads from here at runtime — no .env or code changes needed.
 *
 * Only one provider per type (EMAIL/SMS/WHATSAPP) can be active at a time.
 * Setting a provider as active automatically deactivates others of the same type.
 */

// Provider metadata — defines what fields each provider needs
const PROVIDER_FIELDS: Record<
  string,
  { type: string; provider: string; label: string; fields: { key: string; label: string; type: "text" | "password"; placeholder?: string; required: boolean }[] }
> = {
  "EMAIL-ses": {
    type: "EMAIL",
    provider: "ses",
    label: "Amazon SES",
    fields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", placeholder: "AKIA...", required: true },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "password", placeholder: "••••••••", required: true },
      { key: "region", label: "AWS Region", type: "text", placeholder: "eu-central-1", required: true },
      { key: "fromEmail", label: "From Email", type: "text", placeholder: "noreply@votewise.com.ng", required: true },
    ],
  },
  "EMAIL-resend": {
    type: "EMAIL",
    provider: "resend",
    label: "Resend",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "re_...", required: true },
      { key: "fromEmail", label: "From Email", type: "text", placeholder: "noreply@votewise.com.ng", required: true },
    ],
  },
  "SMS-termii": {
    type: "SMS",
    provider: "termii",
    label: "Termii (SMS)",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "TL...", required: true },
      { key: "senderId", label: "Sender ID", type: "text", placeholder: "Votewise", required: true },
      { key: "channel", label: "Channel", type: "text", placeholder: "dnd / generic", required: false },
    ],
  },
  "WHATSAPP-termii": {
    type: "WHATSAPP",
    provider: "termii",
    label: "Termii (WhatsApp)",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "TL...", required: true },
      { key: "sender", label: "WhatsApp Sender", type: "text", placeholder: "Your WhatsApp business number", required: true },
    ],
  },
};

export async function GET() {
  try {
    await requireRole("PLATFORM_ADMIN");

    const configs = await db.providerConfig.findMany({
      orderBy: [{ type: "asc" }, { provider: "asc" }],
    });

    // Decrypt credentials for display (mask sensitive fields)
    const result = configs.map((c) => {
      const creds = decryptJSON<Record<string, string>>(c.credentials);
      const maskedCreds: Record<string, string> = {};
      const fieldsKey = `${c.type}-${c.provider}`;
      const fieldDefs = PROVIDER_FIELDS[fieldsKey]?.fields ?? [];

      for (const [key, value] of Object.entries(creds)) {
        const fieldDef = fieldDefs.find((f) => f.key === key);
        if (fieldDef?.type === "password" && value) {
          maskedCreds[key] = value.slice(0, 4) + "••••••••";
        } else {
          maskedCreds[key] = value;
        }
      }

      return {
        id: c.id,
        type: c.type,
        provider: c.provider,
        isActive: c.isActive,
        label: PROVIDER_FIELDS[fieldsKey]?.label ?? c.provider,
        fields: fieldDefs,
        credentials: maskedCreds,
        isConfigured: Object.values(creds).some((v) => v),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return ok({
      providers: result,
      availableProviders: Object.values(PROVIDER_FIELDS),
    });
  } catch (e) {
    return handleError(e);
  }
}

const saveSchema = z.object({
  type: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  provider: z.string(),
  credentials: z.record(z.string()),
  activate: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    await requireRole("PLATFORM_ADMIN");
    const body = await request.json();
    const parsed = saveSchema.parse(body);

    // Validate that this is a known provider
    const fieldsKey = `${parsed.type}-${parsed.provider}`;
    if (!PROVIDER_FIELDS[fieldsKey]) {
      return fail(`Unknown provider: ${parsed.type}/${parsed.provider}`, "UNKNOWN_PROVIDER", 400);
    }

    // Check required fields
    const fieldDefs = PROVIDER_FIELDS[fieldsKey].fields;
    for (const field of fieldDefs) {
      if (field.required && !parsed.credentials[field.key]?.trim()) {
        return fail(`Missing required field: ${field.label}`, "MISSING_FIELD", 400);
      }
    }

    // Add provider identifier so the factory knows which provider to instantiate
    const credsWithProvider = {
      ...parsed.credentials,
      __provider: parsed.provider,
    };

    // Encrypt credentials
    const encryptedCreds = encryptJSON(credsWithProvider);

    // Upsert the provider config
    const config = await db.providerConfig.upsert({
      where: {
        type_provider: {
          type: parsed.type,
          provider: parsed.provider,
        },
      },
      create: {
        type: parsed.type,
        provider: parsed.provider,
        credentials: encryptedCreds,
        isActive: parsed.activate,
      },
      update: {
        credentials: encryptedCreds,
        isActive: parsed.activate,
      },
    });

    // If activating, deactivate other providers of the same type
    if (parsed.activate) {
      await db.providerConfig.updateMany({
        where: {
          type: parsed.type,
          NOT: { id: config.id },
        },
        data: { isActive: false },
      });
    }

    return ok({ config: { id: config.id, type: config.type, provider: config.provider, isActive: config.isActive } }, 201);
  } catch (e) {
    return handleError(e);
  }
}

// Delete a provider config
export async function DELETE(request: Request) {
  try {
    await requireRole("PLATFORM_ADMIN");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return fail("Provider config ID required", "BAD_REQUEST", 400);

    await db.providerConfig.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

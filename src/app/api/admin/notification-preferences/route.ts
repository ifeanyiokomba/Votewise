import { ok, handleError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { safeJsonParse } from "@/lib/utils";
import { z } from "zod";

const PREFS_KEY = "notificationPreferences";

interface NotificationPrefs {
  "election-live": { email: boolean; sms: boolean; whatsapp: boolean };
  "vote-cast": { email: boolean; sms: boolean; whatsapp: boolean };
  "election-closed": { email: boolean; sms: boolean; whatsapp: boolean };
  "results-published": { email: boolean; sms: boolean; whatsapp: boolean };
  "security-alert": { email: boolean; sms: boolean; whatsapp: boolean };
}

const DEFAULT_PREFS: NotificationPrefs = {
  "election-live": { email: true, sms: false, whatsapp: false },
  "vote-cast": { email: false, sms: false, whatsapp: false },
  "election-closed": { email: true, sms: false, whatsapp: false },
  "results-published": { email: true, sms: false, whatsapp: false },
  "security-alert": { email: true, sms: true, whatsapp: false },
};

const prefsSchema = z.object({
  "election-live": z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
  "vote-cast": z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
  "election-closed": z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
  "results-published": z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
  "security-alert": z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
});

export async function GET() {
  try {
    const user = await requireOrgAdmin();
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { branding: true },
    });
    const branding = safeJsonParse<Record<string, unknown>>(org?.branding, {});
    const prefs = (branding[PREFS_KEY] as NotificationPrefs) ?? DEFAULT_PREFS;
    return ok({ preferences: prefs });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireOrgAdmin();
    const body = await request.json();
    const parsed = prefsSchema.parse(body);

    // Fetch current branding, merge prefs in
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { branding: true },
    });
    const branding = safeJsonParse<Record<string, unknown>>(org?.branding, {});
    branding[PREFS_KEY] = parsed;

    await db.organization.update({
      where: { id: user.organizationId },
      data: { branding: JSON.stringify(branding) },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { section: "notification-preferences" },
    });

    return ok({ preferences: parsed });
  } catch (e) {
    return handleError(e);
  }
}

export { DEFAULT_PREFS, PREFS_KEY };
export type { NotificationPrefs };

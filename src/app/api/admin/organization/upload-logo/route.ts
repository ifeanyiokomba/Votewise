import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

/**
 * Upload organization logo directly from device.
 *
 * Production: stores the image as a base64 data URI in the database.
 * This works on Vercel/serverless (no writable filesystem needed).
 */
export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return fail("No file uploaded", "NO_FILE", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("File exceeds 2MB limit", "FILE_TOO_LARGE", 413);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail("Unsupported file type. Use JPG, PNG, WebP, SVG, or GIF.", "BAD_TYPE", 400);
    }

    // Convert to base64 data URI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Update the organization's logo
    await db.organization.update({
      where: { id: user.organizationId },
      data: { logo: dataUri },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { field: "logo", size: file.size },
    });

    return ok({ logoUrl: dataUri });
  } catch (e) {
    return handleError(e);
  }
}

import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  try {
    const user = await requireOrgAdmin();

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return fail("No file uploaded", "NO_FILE", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("File exceeds 5MB limit", "FILE_TOO_LARGE", 413);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail("Unsupported file type. Use JPG, PNG, WebP, SVG, or GIF.", "BAD_TYPE", 400);
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate a unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `org-${user.organizationId}-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write the file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // The public URL path
    const logoUrl = `/uploads/${filename}`;

    // Update the organization's logo
    await db.organization.update({
      where: { id: user.organizationId },
      data: { logo: logoUrl },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_CHANGE",
      resource: "organization",
      resourceId: user.organizationId,
      result: "SUCCESS",
      metadata: { field: "logo", filename },
    });

    return ok({ logoUrl });
  } catch (e) {
    return handleError(e);
  }
}

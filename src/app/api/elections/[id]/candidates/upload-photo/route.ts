import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "candidates");

/**
 * Upload candidate headshot photo directly from device.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrgAdmin();
    const { id: electionId } = await params;
    await db.election.findFirst({ where: { id: electionId, organizationId: user.organizationId } });

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) return fail("No file uploaded", "NO_FILE", 400);
    if (!candidateId) return fail("Candidate ID required", "BAD_REQUEST", 400);
    if (file.size > MAX_FILE_SIZE) return fail("File exceeds 5MB", "FILE_TOO_LARGE", 413);
    if (!ALLOWED_TYPES.includes(file.type)) return fail("Use JPG, PNG, WebP, or GIF", "BAD_TYPE", 400);

    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `cand-${candidateId}-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const photoUrl = `/uploads/candidates/${filename}`;

    await db.candidate.update({
      where: { id: candidateId, electionId },
      data: { photo: photoUrl },
    });

    return ok({ photoUrl });
  } catch (e) {
    return handleError(e);
  }
}

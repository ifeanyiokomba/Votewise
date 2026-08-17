import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB — base64 increases size by ~33%
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Upload candidate headshot photo directly from device.
 *
 * Production: stores the image as a base64 data URI in the database.
 * This works on Vercel/serverless (no writable filesystem needed).
 * For very large deployments, consider using Vercel Blob or S3 instead.
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
    if (file.size > MAX_FILE_SIZE) return fail("File exceeds 2MB", "FILE_TOO_LARGE", 413);
    if (!ALLOWED_TYPES.includes(file.type)) return fail("Use JPG, PNG, WebP, or GIF", "BAD_TYPE", 400);

    // Convert to base64 data URI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    await db.candidate.update({
      where: { id: candidateId, electionId },
      data: { photo: dataUri },
    });

    return ok({ photoUrl: dataUri });
  } catch (e) {
    return handleError(e);
  }
}

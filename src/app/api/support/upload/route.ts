import { ok, handleError, fail } from "@/lib/api-response";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain"];

/**
 * File upload for support chat (screenshots, photos, documents).
 *
 * Production: returns a base64 data URI that can be used directly in <img> tags
 * or sent via socket.io. No filesystem writes needed (Vercel-compatible).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return fail("No file uploaded", "NO_FILE", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("File exceeds 2MB limit", "FILE_TOO_LARGE", 413);
    }

    // For images, return base64 data URI; for other files, return metadata only
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return fail("Unsupported image type. Use JPG, PNG, WebP, or GIF.", "BAD_TYPE", 400);
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;

      return ok({
        fileUrl: dataUri,
        filename: file.name,
        size: file.size,
        type: file.type,
      });
    }

    // Non-image files — just return metadata (text content for small files)
    if (file.type === "text/plain" && file.size < 10000) {
      const text = await file.text();
      return ok({
        fileUrl: null,
        filename: file.name,
        size: file.size,
        type: file.type,
        textPreview: text.slice(0, 500),
      });
    }

    // PDFs and other files — return metadata only (can't preview without a viewer)
    return ok({
      fileUrl: null,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (e) {
    return handleError(e);
  }
}

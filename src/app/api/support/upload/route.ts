import { ok, handleError, fail } from "@/lib/api-response";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "support");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return fail("No file uploaded", "NO_FILE", 400);
    if (file.size > MAX_FILE_SIZE) return fail("File exceeds 10MB limit", "FILE_TOO_LARGE", 413);
    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail("Unsupported file type. Use JPG, PNG, WebP, GIF, PDF, TXT, or DOC/DOCX.", "BAD_TYPE", 400);
    }

    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `support-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const fileUrl = `/uploads/support/${filename}`;

    return ok({ fileUrl, filename: file.name, fileType: file.type, fileSize: file.size });
  } catch (e) {
    return handleError(e);
  }
}

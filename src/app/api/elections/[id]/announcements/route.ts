import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const announcementSchema = z.object({
  title: z.string().min(2, "Title required").max(200),
  message: z.string().min(5, "Message required").max(2000),
  type: z.enum(["info", "warning", "success", "urgent"]).default("info"),
  isActive: z.boolean().default(true),
});

/**
 * Create/list election announcements that show on voter pages.
 * Admins can type announcements that appear as banners on the voting page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await db.election.findFirst({ where: { id, organizationId: user.organizationId } });

    const announcements = await db.notification.findMany({
      where: { electionId: id, metadata: { contains: "announcement" } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return ok({ announcements });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await db.election.findFirst({ where: { id, organizationId: user.organizationId } });

    const body = await request.json();
    const parsed = announcementSchema.parse(body);

    const notification = await db.notification.create({
      data: {
        type: "IN_APP",
        recipient: "voters",
        subject: parsed.title,
        body: parsed.message,
        electionId: id,
        status: parsed.isActive ? "SENT" : "QUEUED",
        metadata: JSON.stringify({
          kind: "announcement",
          announcementType: parsed.type,
          isActive: parsed.isActive,
        }),
      },
    });

    return ok({ announcement: notification }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await db.election.findFirst({ where: { id, organizationId: user.organizationId } });

    const { searchParams } = new URL(request.url);
    const notifId = searchParams.get("notifId");
    if (!notifId) return fail("Notification ID required", "BAD_REQUEST", 400);

    await db.notification.delete({ where: { id: notifId } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

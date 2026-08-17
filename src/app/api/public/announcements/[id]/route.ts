import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";

/**
 * Public announcements for an election — shown on voter pages.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const announcements = await db.notification.findMany({
      where: {
        electionId: id,
        metadata: { contains: "announcement" },
        status: "SENT",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        subject: true,
        body: true,
        metadata: true,
        createdAt: true,
      },
    });

    return ok({ announcements });
  } catch (e) {
    return handleError(e);
  }
}
